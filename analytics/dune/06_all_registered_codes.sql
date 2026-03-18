-- Query 6: All registered codes with owners
-- Replaces the need for a subgraph - provides the full registry of minted codes.
-- Reads TagMinted events from the TagRegistry contract.
--
-- Replace {{tag_registry_address}} with the deployed TagRegistry contract address.
-- Replace the topic1 value with keccak256("TagMinted(uint256,string,address)").

WITH minted_codes AS (
    SELECT
        -- tokenId (indexed, topic2)
        bytearray_to_uint256(topic2) AS token_id,
        -- owner (indexed, topic3)
        CAST(bytearray_substring(topic3, 13, 20) AS varbinary) AS owner_address,
        -- code string (non-indexed, ABI-encoded in data)
        from_utf8(
            bytearray_substring(
                data,
                65, -- skip 32-byte offset + 32-byte length, string starts at byte 65
                bytearray_to_uint256(bytearray_substring(data, 33, 32)) -- string length
            )
        ) AS code,
        block_time AS minted_at,
        block_number AS mint_block,
        tx_hash AS mint_tx_hash
    FROM ethereum.logs
    WHERE
        contract_address = {{tag_registry_address}}
        -- TagMinted event topic - replace with actual keccak256 hash
        AND topic1 = 0x -- Replace with keccak256("TagMinted(uint256,string,address)")
),

-- Track ERC-721 transfers to get current owner
-- (in case code NFTs have been transferred after minting)
transfers AS (
    SELECT
        bytearray_to_uint256(topic3) AS token_id,
        CAST(bytearray_substring(topic2, 13, 20) AS varbinary) AS from_address,
        CAST(bytearray_substring(topic1, 13, 20) AS varbinary) AS to_address,
        block_time,
        block_number
    FROM ethereum.logs
    WHERE
        contract_address = {{tag_registry_address}}
        -- Transfer(address,address,uint256) - standard ERC-721 event
        AND topic0 = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
),

-- Get the latest owner for each token
current_owners AS (
    SELECT
        token_id,
        to_address AS current_owner,
        block_time AS last_transfer_time
    FROM (
        SELECT
            token_id,
            to_address,
            block_time,
            ROW_NUMBER() OVER (PARTITION BY token_id ORDER BY block_number DESC, tx_index DESC) AS rn
        FROM transfers
    )
    WHERE rn = 1
)

SELECT
    m.token_id,
    m.code,
    COALESCE(co.current_owner, m.owner_address) AS current_owner,
    m.owner_address AS original_minter,
    m.minted_at,
    m.mint_block,
    m.mint_tx_hash,
    CASE
        WHEN co.current_owner IS NOT NULL AND co.current_owner != m.owner_address
        THEN true
        ELSE false
    END AS has_been_transferred,
    co.last_transfer_time
FROM minted_codes m
LEFT JOIN current_owners co
    ON m.token_id = co.token_id
ORDER BY m.token_id ASC
