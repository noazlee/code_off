# Refactoring Notes - Noah Lee 8/25/25

## Backend 
* Database layer - extract all database operations into seperate modules
* Game logic - move game room management into own service
* Authenticatino - seperate auth logic
* Websocket handlers - extract socket.io event handlers
* API routes - group related endpoints together

## Frontend
* State management
* Extract sub-components
* Custom hooks: exctrack socket logic and game state management
* Split UI logic from business logic

## Current Problems
* Global variables: game_rooms, connected_users in app.py -> not self-contained - hidden dependencies - cant test functions in isolation - need to reset globals between tests - race conditions (simultaneous connection)
* Lots of reused code: similar api endpoints, repeated socket event handling
* Long functions
* Mixed responsibilities - queries with business logic

## Best practices:
* Single Responsibility: Each module/component should do one thing
* DRY (Don't Repeat Yourself): Extract common patterns
* Dependency Injection: Pass dependencies rather than importing globals
* Clear Naming: Use descriptive names for functions and variables
* Documentation: Add docstrings and comments for complex logic

## Todo:
* Create test suite
* Module by module
* Small changes - test frequently

* Refactored auth
* Currently testing

### Order:
1. Set up testing infrastructure first
2. Write tests for existing monolithic app.py
3. Refactor into modules while ensuring tests pass
4. Add integration tests for the modularized structure 
5. Set up CI/CD with test automation 

## Setting up testing framework:
### Backend testing (Python)
`pip install pytest pytest-cov pytest-mock`
### Frontend (React)
`npm install --save-dev @testing-library/react @testing-library/jest-dom jest`
