# PTCG Eventjams

A web application for hosting and managing Pokémon Trading Card Game (PTCG) events, built with Nuxt 3.

## Feature Roadmap

- [x] Create and manage events
- [x] Register participants
- [x] Submit decklists
- [ ] Automatic decklist validation
- [x] Find events in your proximity 

## Maybe Features
- [ ] View event standings and results
- [ ] TOM-compatible output for Pokémon Play Tools
- [ ] Digital Pairings for matches


## Setup

Make sure to install dependencies:

```bash
# Install dependencies
yarn install

yarn run build

yarn run [dev|preview|production]
```

On first run, the server will create a PostgreSQL database and populate it with card data, taken from 
TCGDex Database. This may take a minute. 






---

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
