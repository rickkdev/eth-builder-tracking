-- Query 2: Join parsed builder tags with TagRegistry TagMinted events to get code owners
-- Links on-chain attributed transactions to the registered code owner.
--
-- TagRegistry emits: TagMinted(uint256 indexed tokenId, string code, address indexed owner)
-- Event signature: keccak256("TagMinted(uint256,string,address)")

-- Replace {{tag_registry_address}} with the deployed TagRegistry contract address

WITH code_owners AS (
    SELECT
        -- tokenId is topic2 (indexed)
        bytearray_to_uint256(topic2) AS token_id,
        -- owner is topic3 (indexed)
        CAST(bytearray_substring(topic3, 13, 20) AS varbinary) AS owner_address,
        -- code string is in the event data (non-indexed, ABI-encoded string)
        -- ABI encoding: offset (32 bytes) + length (32 bytes) + string data (padded)
        from_utf8(
            bytearray_substring(
                data,
                65, -- skip 32-byte offset + 32-byte length prefix, string starts at byte 65
                bytearray_to_uint256(bytearray_substring(data, 33, 32)) -- length of string
            )
        ) AS code,
        block_time AS minted_at,
        block_number AS mint_block
    FROM ethereum.logs
    WHERE
        contract_address = {{tag_registry_address}}
        -- TagMinted(uint256,string,address) event topic
        AND topic1 = 0x -- Replace with actual keccak256 of event signature
        -- For now, match all events from the registry contract
),

-- Use Query 1 logic (simplified reference) to get attributed transactions
attributed_txs AS (
    SELECT
        hash AS tx_hash,
        block_time,
        "from" AS sender,
        value / 1e18 AS value_eth,
        gas_used,
        gas_price,
        gas_used * gas_price / 1e18 AS fee_eth,
        -- Placeholder: use the parsed builder_tag from Query 1
        -- In practice, create this as a Dune view or CTE from Query 1
        'BUILDER_CODE_PLACEHOLDER' AS builder_tag
    FROM ethereum.transactions
    WHERE bytearray_length(data) >= 5
        AND bytearray_substring(data, bytearray_length(data) - 3, 4) = 0x80218021
)

SELECT
    a.tx_hash,
    a.block_time,
    a.sender,
    a.value_eth,
    a.fee_eth,
    a.builder_tag,
    c.owner_address AS code_owner,
    c.token_id,
    c.minted_at AS code_minted_at
FROM attributed_txs a
LEFT JOIN code_owners c
    ON a.builder_tag = c.code
ORDER BY a.block_time DESC
