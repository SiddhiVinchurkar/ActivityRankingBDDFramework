Feature: Activity Ranking API - Open-Meteo error handling

  As a user
  I want the Activity Ranking API to handle weather provider failures
  So that I receive a meaningful error when weather data cannot be retrieved

  # Open-Meteo is a third-party API, so failure conditions should not depend
  # on the real service being unavailable during test execution.
  #
  # Open-Meteo responses will be mocked/stubbed to simulate unavailable and 
  # incomplete provider responses.
  #
  # As there is currently no System Under Test (SUT), the exact mocking mechanism
  # cannot be implemented yet. It will depend on how the application integrates
  # with Open-Meteo. These scenarios define the expected behaviour first and are
  # expected to remain in a red state until the implementation is available.

  Background:
    Given the Activity Ranking API is available


  Scenario: Open-Meteo is unavailable while retrieving weather data
    Given the user enters city or town name "London"
    And the Open-Meteo API is mocked as unavailable
    When the user requests activity recommendations
    Then the response status should be 503
    And the error response should indicate that weather data is temporarily unavailable


  Scenario: Open-Meteo returns incomplete forecast data
    Given the user enters city or town name "London"
    And Open-Meteo is mocked to return incomplete 7-day weather forecast data for "London"
    When the user requests activity recommendations
    Then the response status should be 502
    And the response should contain an error code "INCOMPLETE_WEATHER_DATA"
    And the response should contain an error message "Complete weather forecast data could not be retrieved"