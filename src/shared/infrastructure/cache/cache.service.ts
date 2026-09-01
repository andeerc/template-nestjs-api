import { Injectable } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

@Injectable()
export class CacheService {
	constructor(@InjectRedis() private readonly _redis: Redis) {}

	get cache(): Redis {
		return this._redis;
	}
}
