/* eslint-disable @typescript-eslint/no-empty-object-type */
/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			requestId: string;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
}

export {};
