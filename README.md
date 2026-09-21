# MEMORY MATCH GAME

### `High Score Game - With working leaderboard`

Complete matching game done with native support in mind. Built with Quasar and can be exported for Mobile, Web, PWA or Desktop.

Visit official game at: [Memory Match Game](https://jaimegonzalezjr.com/games/memory/).

## Built With
* Quasar (Front-End/Styling)
* Strapi Headless CMS (Back-End)

![Screenshot](https://github.com/lnsflive/MatchMemoryGame/blob/main/src/assets/ss1.png)
![Screenshot](https://github.com/lnsflive/MatchMemoryGame/blob/main/src/assets/ss2.png)

## Build Setup

```bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:8080
$ yarn run webDebug // quasar dev
```

## Google account login and Web Station deployment

The browser uses native Strapi REST with a shared strapi_jwt local-storage bearer token. Google returns to this app's own `/games/memory/` callback. The reusable account client and form are served from `https://api.jaimegonzalezjr.com/auth/client.v1.js` and maintained in the Strapi repository. Native game collections enforce account ownership on the server. Existing anonymous names require administrator migration. API_BASE_URL defaults to https://api.jaimegonzalezjr.com.


Account controls mount inside this app's own layout. Strapi Content Manager → OAuth Applications configures callback/return URLs, Google/password options, registration, and shared/separate sessions. Current configuration is Google with shared login. No provider secrets belong in frontend environment files.

## Local configuration and publishing

Normal builds use `/` as their base path. Set `APP_BASE_PATH` in the build environment to host under a subdirectory; unset or empty leaves the default. Set `API_BASE_URL` for the compatible shared-account backend. Environment values are embedded during the build. Private `.env` overrides are ignored by Git; only `.env.example` is tracked.

Build the application using its normal npm build/generate command, then publish the completed static output with your own hosting tools. Personal deployment scripts, NAS paths, and publishing credentials belong outside this public repository. Configure the backend OAuth application registry with this deployment's own callback and return URLs. Browser route guards do not replace backend ownership checks.
