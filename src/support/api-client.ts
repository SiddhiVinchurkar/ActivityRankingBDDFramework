import { APIRequestContext, APIResponse, request } from "playwright";
import { WeatherMode } from "./world";

export interface RecommendationRequest {
  location?: string;
  selectedLocation?: string;
  weatherMode?: WeatherMode;
  locationResolution?: "normal" | "not-found" | "resolved";
}

export class ApiClient {
  private sutContext?: APIRequestContext;
  private openMeteoContext?: APIRequestContext;

  async start(): Promise<void> {
    this.sutContext = await request.newContext({
      baseURL: process.env.BASE_URL ?? "http://localhost:3000",
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });

    this.openMeteoContext = await request.newContext({
      baseURL: "https://api.open-meteo.com",
      extraHTTPHeaders: {
        Accept: "application/json"
      }
    });
  }

  async stop(): Promise<void> {
    await this.sutContext?.dispose();
    await this.openMeteoContext?.dispose();
  }

  async checkActivityRankingApi(): Promise<APIResponse> {
    this.ensureStarted();
    return this.sutContext!.get("/health");
  }

  async checkOpenMeteoApi(): Promise<APIResponse> {
    this.ensureStarted();
    // A small known-coordinate request is used only as an availability check.
    return this.openMeteoContext!.get(
      "/v1/forecast?latitude=51.5072&longitude=-0.1276&forecast_days=1&daily=temperature_2m_max"
    );
  }

  async getActivityRecommendations(
    input: RecommendationRequest
  ): Promise<APIResponse> {
    this.ensureStarted();

    const params = new URLSearchParams();

    if (input.location !== undefined) {
      params.set("location", input.location);
    }

    if (input.selectedLocation) {
      params.set("selectedLocation", input.selectedLocation);
    }

    /*
     * The ticket has no SUT yet. These headers describe the test seam expected
     * from the future implementation so controlled provider behaviour can be
     * exercised without depending on changing live weather.
     */
    const headers: Record<string, string> = {
      "x-test-weather-mode": input.weatherMode ?? "live",
      "x-test-location-resolution": input.locationResolution ?? "normal"
    };

    const query = params.toString();
    return this.sutContext!.get(
      `/api/activities${query ? `?${query}` : ""}`,
      { headers }
    );
  }

  async searchLocations(partialName: string): Promise<APIResponse> {
    this.ensureStarted();

    return this.sutContext!.get(
      `/api/locations?query=${encodeURIComponent(partialName)}`
    );
  }

  private ensureStarted(): void {
    if (!this.sutContext || !this.openMeteoContext) {
      throw new Error("API client has not been started");
    }
  }
}
