-- Query 1: Parse transactions with ERC-8021 builder tag suffixes
-- Scans the trailing bytes of transaction calldata for the repeating 0x8021 marker,
-- then extracts the ASCII builder tag.
--
-- ERC-8021 suffix format (appended to end of calldata):
--   [0x00 schema byte][length byte][ASCII code bytes][0x8021 repeating marker]
--
-- The 0x8021 marker repeats ceil((2 + code_length) / 2) times at the end.
-- We detect it by checking if the last 4 bytes are 0x80218021.

WITH raw_txs AS (
    SELECT
        hash,
        block_time,
        block_number,
        "from" AS sender,
        "to" AS receiver,
        value,
        gas_used,
        gas_price,
        data AS input_data
    FROM ethereum.transactions
    WHERE
        -- Only look at transactions with calldata long enough to contain a suffix
        -- Minimum suffix: 1-byte schema + 1-byte length + 1-byte code + 2-byte marker = 5 bytes
        bytearray_length(data) >= 5
        -- Check for 0x8021 marker in last 4 bytes (repeating pattern)
        AND bytearray_substring(data, bytearray_length(data) - 3, 4) = 0x80218021
),

parsed AS (
    SELECT
        hash,
        block_time,
        block_number,
        sender,
        receiver,
        value,
        gas_used,
        gas_price,
        input_data,
        -- The marker region ends at the end of calldata.
        -- Walk backwards past the 0x8021 repeating region to find where the code ends.
        -- The byte just before the marker region is the last byte of the ASCII code.
        -- The schema byte (0x00) is at offset: end - marker_length - code_length - 1
        -- The length byte follows the schema byte and tells us the code length.

        -- Step 1: Find how many 0x8021 pairs are at the end
        -- We know at least 2 bytes (one 0x8021) exist. Scan backwards in 2-byte steps.
        -- For simplicity, extract the length byte which is at a known offset:
        --   length_byte_pos = end_of_data - marker_bytes - code_length - 1
        -- But we know length_byte from the suffix structure:
        --   The length byte is the second byte of the suffix (after 0x00 schema byte).

        -- Strategy: find the start of the suffix by scanning backwards past 0x8021 markers,
        -- then read schema + length + code.

        -- Count marker bytes: each 0x8021 is 2 bytes. The marker repeats ceil((2 + code_len) / 2) times.
        -- Total suffix size = 1 (schema) + 1 (length) + code_len + 2 * ceil((2 + code_len) / 2)

        -- Alternative simpler approach: read the length byte at a known position.
        -- After the last 0x8021 markers, walk back. The byte at position (end - marker_region_size)
        -- is the last code byte. But we need marker_region_size.

        -- Practical approach: iterate possible code lengths (1-32) and check if the structure is valid.
        -- For each candidate length L:
        --   marker_count = ceil((2 + L) / 2)
        --   marker_bytes = marker_count * 2
        --   suffix_start = bytearray_length - (1 + 1 + L + marker_bytes) + 1
        --   Check: byte at suffix_start = 0x00 (schema) AND byte at suffix_start+1 = L

        -- We use a cross join with a sequence to try all lengths 1..32
        bytearray_length(input_data) AS data_length
    FROM raw_txs
)

SELECT
    p.hash AS tx_hash,
    p.block_time,
    p.block_number,
    p.sender,
    p.receiver,
    p.value / 1e18 AS value_eth,
    p.gas_used,
    p.gas_price,
    p.gas_used * p.gas_price / 1e18 AS fee_eth,
    lengths.code_length,
    -- Extract the ASCII code string
    from_utf8(
        bytearray_substring(
            p.input_data,
            -- code starts at: data_length - marker_bytes - code_length + 1
            CAST(p.data_length - (CAST(ceiling((2.0 + lengths.code_length) / 2) AS INTEGER) * 2) - lengths.code_length + 1 AS INTEGER),
            lengths.code_length
        )
    ) AS builder_tag
FROM parsed p
CROSS JOIN UNNEST(sequence(1, 32)) AS lengths(code_length)
WHERE
    -- Verify the suffix structure is valid for this candidate code length
    -- marker_count = ceil((2 + code_length) / 2)
    -- marker_bytes = marker_count * 2
    -- suffix_total = 1 + 1 + code_length + marker_bytes
    -- suffix_start_index = data_length - suffix_total + 1

    -- Check 1: data is long enough for this suffix
    p.data_length >= 1 + 1 + lengths.code_length + (CAST(ceiling((2.0 + lengths.code_length) / 2) AS INTEGER) * 2)

    -- Check 2: schema byte is 0x00
    AND bytearray_substring(
        p.input_data,
        CAST(p.data_length - (1 + 1 + lengths.code_length + CAST(ceiling((2.0 + lengths.code_length) / 2) AS INTEGER) * 2) + 1 AS INTEGER),
        1
    ) = 0x00

    -- Check 3: length byte matches candidate length
    AND bytearray_substring(
        p.input_data,
        CAST(p.data_length - (1 + 1 + lengths.code_length + CAST(ceiling((2.0 + lengths.code_length) / 2) AS INTEGER) * 2) + 2 AS INTEGER),
        1
    ) = CAST(from_hex(lpad(to_hex(lengths.code_length), 2, '0')) AS varbinary)
