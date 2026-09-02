FROM php:8.4-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libfreetype6-dev \
        libicu-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        libpq-dev \
        libzip-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        gd \
        intl \
        opcache \
        pdo_mysql \
        pdo_pgsql \
        pgsql \
        zip \
    && a2enmod headers rewrite \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY . .

RUN composer dump-autoload --optimize \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/start.sh /usr/local/bin/start
RUN chmod +x /usr/local/bin/start

EXPOSE 10000

CMD ["start"]
