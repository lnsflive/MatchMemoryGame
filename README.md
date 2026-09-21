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

## Google account login and Web Station deployment

The browser uses the shared HttpOnly session at `API_BASE_URL` (default `https://api.jaimegonzalezjr.com`). No Google secrets or Strapi administrator tokens belong in the browser. The backend must expose `/portfolio/session`, `/portfolio/auth/start`, `/portfolio/auth/logout`, and the owned game profile/leaderboard routes before deployment. Existing anonymous names require administrator migration; typing a name cannot claim it.

Set `API_BASE_URL` and `APP_BASE_PATH` in the build environment; `DEPLOY_DIR` controls the Web Station output directory. Defaults preserve `/games/memory/`. Run `npm run test:auth`, then `npm run webBuild`, `npm run deploy:preview`, and `npm run deploy`. Deployment backs up existing files into ignored `.deploy-backups/` and retains old hashed assets. It does not delete old URLs or update Google callback configuration.
