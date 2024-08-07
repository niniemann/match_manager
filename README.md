# Match Manager

This project is supposed to become a flexible management tool to coordinate any kind of `Hell Let Loose`
league/tournament, for communities that mostly rely on discord, with a web-interface for better usability.
(Let's face it, discord interactions are nice, but limited.)

That is a high goal, and probably not reachable. But, at least for the ECL, this should suffice.

Work in progress. A remake of the existing ECL predictions-/match-status/-website/-bot-thingy.

## To install

- checkout the repository
- create a `config.toml`. The schema is defined in [config.py](./match_manager/config.py).
- copy `dummy_docker_vars.env` to `.env` and adjust the entries as necessary.
- run `docker compose up`
  - this creates two containers
  - one for the database, which is stored in a local folder (`./database` by default)
  - one for the application
  - the required python and npm packages are installed automatically, and the web-app is re-build at every start
- the website is now available at `localhost:5000`, I'd advise to setup nginx to provide a secure (https)
  connection to the outside world.


## Run in development mode

Building the react-app for production every time you make some change, just for the python server to serve it
from the build folder, takes quite some time. Instead, you can serve the web-app and the api separately.

In `match_manager/web/client`, run `npm run start` to serve the web-app in dev-mode at `localhost:3000`.
It will still try to connect to the api served by the python server at `localhost:5000`, but development
of the web-ui should be much smoother this way.
