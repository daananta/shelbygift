module shelbygift::lixi {
    use std::signer;
    use std::string::String;
    use std::option::{Self, Option};
    use std::table::{Self, Table};
    use std::error;
    use std::vector;

    use aptos_framework::randomness;
    use aptos_framework::object::{Self, ExtendRef, Object};
    use aptos_framework::fungible_asset::{Self as fa, Metadata, FungibleStore};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_framework::event;

    // ── Error codes ───────────────────────────────────────────
    const E_NAME_TOO_LONG: u64 = 1;
    const E_MESSAGE_TOO_LONG: u64 = 2;
    const E_INVALID_MAX_CLAIMS: u64 = 4;
    const E_MAX_CLAIMS_EXCEEDED: u64 = 5;
    const E_CREATOR_NAME_TOO_LONG: u64 = 6;
    const E_ZERO_AMOUNT: u64 = 7;
    const E_ALLOWED_USERS_TOO_LARGE: u64 = 8;
    const E_INVALID_ENVELOPE_ADDR: u64 = 9;
    const E_CLAIMS_EXHAUSTED: u64 = 10;
    const E_ALREADY_CLAIMED: u64 = 11;
    const E_ENVELOPE_NOT_STARTED: u64 = 12;
    const E_ENVELOPE_EXPIRED: u64 = 13;
    const E_PASSCODE_REQUIRED: u64 = 14;
    const E_INVALID_PASSCODE: u64 = 15;
    const E_NOT_IN_ALLOWED_USERS: u64 = 16;
    const E_BLOB_ID_TOO_LONG: u64 = 17;

    // ── Constants ─────────────────────────────────────────────
    const MAX_NAME_LEN: u64 = 32;
    const MAX_MESSAGE_LEN: u64 = 280;
    const MAX_CLAIMS: u64 = 500;
    const MAX_ALLOWED_USERS: u64 = 500;
    const MAX_BLOB_ID_LEN: u64 = 256; // Shelby blob_id tối đa

    // ── Structs ───────────────────────────────────────────────
    struct Envelope has key {
        // Thông tin hiển thị
        name: String,
        message: String,
        creator_name: String,
        creator_address: address,

        // Shelby media — Option vì upload là tùy chọn
        // blob_id do Shelby SDK trả về sau khi upload mp4/mp3/ảnh
        // frontend dùng blob_id này để gọi readBlob() sau khi claim
        blob_id: Option<String>,

        // Token
        total_amount: u64,
        fa_metadata: Object<Metadata>,
        fa_store: Object<FungibleStore>,

        // Claim tracking
        max_claims: u64,
        current_claims: u64,
        claimed_users: Table<address, u64>, // address → amount nhận được

        // Access control
        allowed_users: vector<address>, // rỗng = public
        config: EnvelopeConfig,
        extend_ref: ExtendRef
    }

    struct EnvelopeConfig has store {
        is_random: bool, // true = lucky draw, false = chia đều
        passcode_hash: Option<vector<u8>>,
        start_time: Option<u64>, // none = mở ngay
        end_time: Option<u64> // none = không hết hạn
    }

    // ── Events ────────────────────────────────────────────────
    #[event]
    struct EnvelopeCreatedEvent has drop, store {
        envelope_address: address,
        creator: address,
        creator_name: String,
        fa_metadata: Object<Metadata>,
        total_amount: u64,
        max_claims: u64,
        is_random: bool,
        has_media: bool, // frontend biết có blob để load không
        blob_id: Option<String>,
        start_time: Option<u64>,
        timestamp: u64
    }

    #[event]
    struct EnvelopeClaimedEvent has drop, store {
        envelope_address: address,
        receiver: address,
        amount: u64,
        // Trả blob_id về trong event để frontend không cần query lại
        blob_id: Option<String>,
        is_last_claim: bool,
        timestamp: u64
    }

    // ── Create envelope ───────────────────────────────────────
    public entry fun create_envelope(
        creator: &signer,
        name: String,
        message: String,
        creator_name: String,
        amount: u64,
        max_claims: u64,
        fa_metadata: Object<Metadata>,
        allowed_users: vector<address>,
        is_random: bool,
        // Shelby blob_id — truyền empty string nếu không upload media
        // frontend upload trước, lấy blob_id rồi mới gọi hàm này
        blob_id_raw: String,
        // Config
        passcode_hash: Option<vector<u8>>,
        start_time: Option<u64>,
        end_time: Option<u64>
    ) {
        assert!(name.length() <= MAX_NAME_LEN, error::invalid_argument(E_NAME_TOO_LONG));
        assert!(
            message.length() <= MAX_MESSAGE_LEN,
            error::invalid_argument(E_MESSAGE_TOO_LONG)
        );
        assert!(
            creator_name.length() <= MAX_NAME_LEN,
            error::invalid_argument(E_CREATOR_NAME_TOO_LONG)
        );
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        assert!(max_claims > 0, error::invalid_argument(E_INVALID_MAX_CLAIMS));
        assert!(max_claims <= MAX_CLAIMS, error::invalid_argument(E_MAX_CLAIMS_EXCEEDED));
        assert!(
            vector::length(&allowed_users) <= MAX_ALLOWED_USERS,
            error::invalid_argument(E_ALLOWED_USERS_TOO_LARGE)
        );
        assert!(
            blob_id_raw.length() <= MAX_BLOB_ID_LEN,
            error::invalid_argument(E_BLOB_ID_TOO_LONG)
        );
        assert!(amount >= max_claims, error::invalid_argument(E_ZERO_AMOUNT));

        // ── blob_id: empty string → None, có giá trị → Some ──
        let blob_id =
            if (blob_id_raw.length() == 0) {
                option::none()
            } else {
                option::some(blob_id_raw)
            };

        let creator_addr = signer::address_of(creator);

        let ctor = object::create_object(creator_addr);
        let object_signer = object::generate_signer(&ctor);
        let extend_ref = object::generate_extend_ref(&ctor);
        let envelope_addr = signer::address_of(&object_signer);

        // ── FungibleStore + nạp tiền ──────────────────────────
        let fa_store = fa::create_store(&ctor, fa_metadata);
        let deposit = primary_fungible_store::withdraw(creator, fa_metadata, amount);
        fa::deposit(fa_store, deposit);

        move_to(
            &object_signer,
            Envelope {
                name,
                message,
                creator_name,
                creator_address: creator_addr,
                blob_id,
                total_amount: amount,
                fa_metadata,
                fa_store,
                max_claims,
                current_claims: 0,
                claimed_users: table::new(),
                allowed_users,
                config: EnvelopeConfig { is_random, passcode_hash, start_time, end_time },
                extend_ref
            }
        );

        event::emit(
            EnvelopeCreatedEvent {
                envelope_address: envelope_addr,
                creator: creator_addr,
                creator_name,
                fa_metadata,
                total_amount: amount,
                max_claims,
                is_random,
                has_media: option::is_some(&blob_id),
                blob_id,
                start_time,
                timestamp: timestamp::now_seconds()
            }
        );
    }

    #[randomness]
    entry fun claim_envelope(
        user: &signer,
        envelope_address: address,
        provided_passcode: Option<vector<u8>>
    ) acquires Envelope {
        assert!(
            exists<Envelope>(envelope_address),
            error::not_found(E_INVALID_ENVELOPE_ADDR)
        );

        let now = timestamp::now_seconds();
        let user_addr = signer::address_of(user);
        let envelope = borrow_global_mut<Envelope>(envelope_address);

        // ── Time checks
        let start_time = *option::borrow_with_default(&envelope.config.start_time, &now);
        let end_time = *option::borrow_with_default(&envelope.config.end_time, &MAX_U64);
        assert!(now >= start_time, error::invalid_state(E_ENVELOPE_NOT_STARTED));
        assert!(now <= end_time, error::invalid_state(E_ENVELOPE_EXPIRED));

        // ── Claim checks
        assert!(
            envelope.current_claims < envelope.max_claims,
            error::invalid_state(E_CLAIMS_EXHAUSTED)
        );
        assert!(
            !table::contains(&envelope.claimed_users, user_addr),
            error::already_exists(E_ALREADY_CLAIMED)
        );

        // ── Access control: whitelist
        if (!vector::is_empty(&envelope.allowed_users)) {
            assert!(
                vector::contains(&envelope.allowed_users, &user_addr),
                error::permission_denied(E_NOT_IN_ALLOWED_USERS)
            );
        };

        // ── Access control: passcode ──────────────────────────
        if (option::is_some(&envelope.config.passcode_hash)) {
            assert!(
                option::is_some(&provided_passcode),
                error::permission_denied(E_PASSCODE_REQUIRED)
            );
            assert!(
                option::borrow(&envelope.config.passcode_hash)
                    == option::borrow(&provided_passcode),
                error::invalid_argument(E_INVALID_PASSCODE)
            );
        };

        let remaining_claims = envelope.max_claims - envelope.current_claims;
        let store_balance = fa::balance(envelope.fa_store);

        let amount =
            if (envelope.config.is_random) {
                if (remaining_claims == 1) {
                    store_balance
                } else {
                    // max = balance * 2 / remaining — giữ nguyên logic cũ
                    // đảm bảo những người sau vẫn còn tiền
                    let max = store_balance * 2 / remaining_claims;
                    if (max <= 1) { 1 }
                    else {
                        randomness::u64_range(1, max)
                    }
                }
            } else {
                // Chia đều — tính từ total để tránh lỗi làm tròn
                envelope.total_amount / envelope.max_claims
            };

        let obj_signer = object::generate_signer_for_extending(&envelope.extend_ref);
        let fa_out = fa::withdraw(&obj_signer, envelope.fa_store, amount);
        primary_fungible_store::deposit(user_addr, fa_out);

        envelope.current_claims = envelope.current_claims + 1;
        // Lưu amount vào claimed_users — frontend có thể query lại
        table::upsert(&mut envelope.claimed_users, user_addr, amount);

        let is_last = envelope.current_claims == envelope.max_claims;

        // Emit event kèm blob_id
        // Frontend nhận event này → nếu has blob_id → gọi readBlob()
        event::emit(
            EnvelopeClaimedEvent {
                envelope_address,
                receiver: user_addr,
                amount,
                blob_id: envelope.blob_id, // trả về để frontend dùng ngay
                is_last_claim: is_last,
                timestamp: now
            }
        );
    }

    // ── View functions ────────────────────────────────────────
    #[view]
    public fun get_envelope_info(
        envelope_address: address
    ): (
        String, // name
        String, // message
        String, // creator_name
        address, // creator_address
        u64, // total_amount
        u64, // max_claims
        u64, // current_claims
        bool, // is_random
        bool, // has_media — frontend biết có blob để load không
        Option<String>, // blob_id
        Option<u64>, // start_time
        Option<u64>, // end_time
        bool // is_open — đã đến giờ mở chưa
    ) acquires Envelope {
        let e = borrow_global<Envelope>(envelope_address);
        let now = timestamp::now_seconds();

        let is_open = {
            let start = *option::borrow_with_default(&e.config.start_time, &0u64);
            start == 0 || now >= start
        };

        (
            e.name,
            e.message,
            e.creator_name,
            e.creator_address,
            e.total_amount,
            e.max_claims,
            e.current_claims,
            e.config.is_random,
            option::is_some(&e.blob_id),
            e.blob_id,
            e.config.start_time,
            e.config.end_time,
            is_open
        )
    }

    #[view]
    public fun has_claimed(
        user_addr: address, envelope_address: address
    ): bool acquires Envelope {
        let e = borrow_global<Envelope>(envelope_address);
        table::contains(&e.claimed_users, user_addr)
    }

    #[view]
    public fun get_claimed_amount(
        user_addr: address, envelope_address: address
    ): u64 acquires Envelope {
        let e = borrow_global<Envelope>(envelope_address);
        if (table::contains(&e.claimed_users, user_addr)) {
            *table::borrow(&e.claimed_users, user_addr)
        } else { 0 }
    }

    #[view]
    public fun get_remaining(envelope_address: address): (u64, u64) acquires Envelope {
        let e = borrow_global<Envelope>(envelope_address);
        (
            e.max_claims - e.current_claims, // lượt claim còn lại
            fa::balance(e.fa_store) // tiền còn lại trong store
        )
    }
}

