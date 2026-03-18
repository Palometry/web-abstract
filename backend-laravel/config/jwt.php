<?php

return [
    'secret' => env('JWT_SECRET'),
    'expires_in' => env('JWT_EXPIRES_IN', '12h'),
];
