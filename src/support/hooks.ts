import { After, Before } from "@cucumber/cucumber";
import { ApiClient } from "./api-client";
import { TestWorld } from "./world";

export const apiClient = new ApiClient();

Before(async function (this: TestWorld) {
  this.resetScenarioState();
  await apiClient.start();
});

After(async function () {
  await apiClient.stop();
});
