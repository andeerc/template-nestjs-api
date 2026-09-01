import { envConfig } from "@/config/env.config";

const CUSTOM_EPOCH = 1735689600000n; // 2025-01-01T00:00:00.000Z
const NODE_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_NODE_ID = (1n << NODE_ID_BITS) - 1n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;
const NODE_ID_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = NODE_ID_BITS + SEQUENCE_BITS;

const configuredNodeId = normalizeNodeId(envConfig.ids.snowflakeNodeId);

let lastTimestamp = -1n;
let sequence = 0n;

export function generateSnowflakeId(): string {
	let timestamp = currentTimestamp();

	if (timestamp < lastTimestamp) {
		timestamp = waitForTimestamp(lastTimestamp);
	}

	if (timestamp === lastTimestamp) {
		sequence = (sequence + 1n) & MAX_SEQUENCE;

		if (sequence === 0n) {
			timestamp = waitForNextMillisecond(timestamp);
		}
	} else {
		sequence = 0n;
	}

	lastTimestamp = timestamp;

	const id =
		((timestamp - CUSTOM_EPOCH) << TIMESTAMP_SHIFT) |
		(configuredNodeId << NODE_ID_SHIFT) |
		sequence;

	return id.toString();
}

function normalizeNodeId(value: string | undefined): bigint {
	if (!value) {
		return 0n;
	}

	const parsed = BigInt(value);

	if (parsed < 0n || parsed > MAX_NODE_ID) {
		throw new Error(
			`SNOWFLAKE_NODE_ID must be between 0 and ${MAX_NODE_ID.toString()}`,
		);
	}

	return parsed;
}

function currentTimestamp(): bigint {
	return BigInt(Date.now());
}

function waitForTimestamp(target: bigint): bigint {
	let timestamp = currentTimestamp();

	while (timestamp < target) {
		timestamp = currentTimestamp();
	}

	return timestamp;
}

function waitForNextMillisecond(current: bigint): bigint {
	let timestamp = currentTimestamp();

	while (timestamp <= current) {
		timestamp = currentTimestamp();
	}

	return timestamp;
}
