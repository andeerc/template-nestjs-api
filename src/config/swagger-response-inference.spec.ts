import type { OpenAPIObject } from "@nestjs/swagger";
import { enrichSwaggerResponsesFromSource } from "./swagger-response-inference";

describe("enrichSwaggerResponsesFromSource", () => {
	it("infers UsersController success and paginated responses from source", () => {
		const document = enrichSwaggerResponsesFromSource(createDocumentStub());

		const createResponse =
			document.paths?.["/users"]?.post?.responses?.["200"]?.content?.[
				"application/json"
			]?.schema;
		const listResponse =
			document.paths?.["/users"]?.get?.responses?.["200"]?.content?.[
				"application/json"
			]?.schema;
		const getOneResponse =
			document.paths?.["/users/{id}"]?.get?.responses?.["200"]?.content?.[
				"application/json"
			]?.schema;
		const updateResponse =
			document.paths?.["/users/{id}"]?.patch?.responses?.["200"]?.content?.[
				"application/json"
			]?.schema;
		const deleteResponse =
			document.paths?.["/users/{id}"]?.delete?.responses?.["200"]?.content?.[
				"application/json"
			]?.schema;
		const createDataSchema = createResponse?.properties?.data as Record<
			string,
			any
		>;
		const listItemSchema = listResponse?.properties?.data?.items as Record<
			string,
			any
		>;

		expect(createDataSchema?.type).toBe("object");
		expect(getOneResponse?.properties?.data).toEqual(createDataSchema);
		expect(listResponse?.properties?.data?.type).toBe("array");
		expect(listItemSchema).toEqual(createDataSchema);
		expect(listResponse?.properties?.meta?.$ref).toBe(
			"#/components/schemas/PaginationMetaDtoInferred",
		);
		expect(updateResponse?.properties?.data).toEqual(createDataSchema);
		expect(deleteResponse?.properties?.data?.nullable).toBe(true);
		expect(deleteResponse?.properties?.data?.example).toBeNull();

		expect(createDataSchema.properties.password).toBeUndefined();
		expect(createDataSchema.properties.id.type).toBe("string");
		expect(createDataSchema.properties.id.format).toBeUndefined();
		expect(createDataSchema.properties.email.type).toBe("string");
		expect(createDataSchema.properties.avatarUrl.nullable).toBe(true);
	});
});

function createDocumentStub(): OpenAPIObject {
	return {
		openapi: "3.0.0",
		info: {
			title: "Test API",
			version: "1.0.0",
		},
		paths: {
			"/users": {
				get: {
					summary: "List users",
				},
				post: {
					summary: "Create user",
				},
			},
			"/users/{id}": {
				get: {
					summary: "Get user by ID",
				},
				patch: {
					summary: "Update user",
				},
				delete: {
					summary: "Delete user",
				},
			},
		},
		components: {
			schemas: {},
		},
	};
}
