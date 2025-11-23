# BookStack Docker Compose Configuration

Two-instance setup with separate MariaDB backends.

## Compose File

Create `/opt/bookstack/docker-compose.yml`:

```yaml
version: "3.8"

services:
  # Personal BookStack
  bookstack_personal_db:
    image: lscr.io/linuxserver/mariadb:latest
    container_name: bookstack_personal_db
    environment:
      - MYSQL_ROOT_PASSWORD=personal_root_pw
      - MYSQL_DATABASE=bookstack_personal
      - MYSQL_USER=bookstack
      - MYSQL_PASSWORD=personal_db_pw
    volumes:
      - bookstack_personal_db:/var/lib/mysql
    restart: unless-stopped
    networks:
      - proxy

  bookstack_personal:
    image: lscr.io/linuxserver/bookstack:latest
    container_name: bookstack_personal
    depends_on:
      - bookstack_personal_db
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Kolkata
      - APP_URL=https://personal.example.com
      - APP_KEY=${APP_KEY_PERSONAL}
      - DB_HOST=bookstack_personal_db
      - DB_PORT=3306
      - DB_USERNAME=bookstack
      - DB_PASSWORD=personal_db_pw
      - DB_DATABASE=bookstack_personal
    volumes:
      - ./personal_config:/config
    restart: unless-stopped
    networks:
      - proxy

  # Public BookStack
  bookstack_public_db:
    image: lscr.io/linuxserver/mariadb:latest
    container_name: bookstack_public_db
    environment:
      - MYSQL_ROOT_PASSWORD=public_root_pw
      - MYSQL_DATABASE=bookstack_public
      - MYSQL_USER=bookstack
      - MYSQL_PASSWORD=public_db_pw
    volumes:
      - bookstack_public_db:/var/lib/mysql
    restart: unless-stopped
    networks:
      - proxy

  bookstack_public:
    image: lscr.io/linuxserver/bookstack:latest
    container_name: bookstack_public
    depends_on:
      - bookstack_public_db
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Kolkata
      - APP_URL=https://public.example.com
      - APP_KEY=${APP_KEY_PUBLIC}
      - DB_HOST=bookstack_public_db
      - DB_PORT=3306
      - DB_USERNAME=bookstack
      - DB_PASSWORD=public_db_pw
      - DB_DATABASE=bookstack_public
    volumes:
      - ./public_config:/config
    restart: unless-stopped
    networks:
      - proxy

volumes:
  bookstack_personal_db:
  bookstack_public_db:

networks:
  proxy:
    external: true
```

## Generate APP_KEYs

```bash
# Personal
docker run --rm lscr.io/linuxserver/bookstack:latest appkey

# Public
docker run --rm lscr.io/linuxserver/bookstack:latest appkey
```

Create `.env` with:
```
APP_KEY_PERSONAL=<generated-key-1>
APP_KEY_PUBLIC=<generated-key-2>
```

## Launch

```bash
cd /opt/bookstack
docker compose up -d
```

