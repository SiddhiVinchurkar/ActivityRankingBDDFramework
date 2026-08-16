import { IWorldOptions, World, setWorldConstructor } from "@cucumber/cucumber";
import { APIResponse } from "playwright";

export type WeatherMode = "live" | "controlled" | "no-data" | "unavailable" | "incomplete";

export class TestWorld extends World {
  response?: APIResponse;
  responseBody: any;

  location?: string;
  partialLocation?: string;
  selectedLocation?: string;

  weatherMode: WeatherMode = "live";
  locationResolution: "normal" | "not-found" | "resolved" = "normal";

  constructor(options: IWorldOptions) {
    super(options);
  }

  resetScenarioState(): void {
    this.response = undefined;
    this.responseBody = undefined;
    this.location = undefined;
    this.partialLocation = undefined;
    this.selectedLocation = undefined;
    this.weatherMode = "live";
    this.locationResolution = "normal";
  }
}

setWorldConstructor(TestWorld);
