# Some Documentation of the project

## CMS

## WebSite

## Forum/Board Discourse
Discourse is running within docker using the recommendated instructions from the discourse project: https://github.com/discourse/discourse/blob/main/docs/INSTALL-cloud.md

### Locations
Discoruse location: /var/discourse
Discourse app.yml: /var/discourse/containers/app.yml
Discourse Data Location: /var/discourse/shared/standalone
Discourse Log Location: /var/discourse/shared/standalone/log/var-log

### Data Structure

### Customized Changes
To make it run with the coolify setup this was done: 
´´
docker_args:
  - "--network=coolify"

labels:
  app_name: discourse
  traefik.enable: true

  traefik.http.middlewares.discourse_redirect2https.redirectscheme.scheme: https
  traefik.http.middlewares.gzip.compress: true

  traefik.http.routers.discourse.rule: Host(`forum.m10z.de`)
  traefik.http.routers.discourse.entrypoints: http
  traefik.http.routers.discourse.middlewares: discourse_redirect2https

  traefik.http.routers.discourse_secure.rule: Host(`forum.m10z.de`)
  traefik.http.routers.discourse_secure.entrypoints: https
  traefik.http.routers.discourse_secure.tls: true
  traefik.http.routers.discourse_secure.tls.certresolver: letsencrypt
  traefik.http.routers.discourse_secure.middlewares: gzip
  traefik.http.services.discourse_secure.loadbalancer.server.port: 80
´´

## Backup Strategy
