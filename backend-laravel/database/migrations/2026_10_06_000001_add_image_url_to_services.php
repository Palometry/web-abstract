<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('icon');
        });

        $defaultImages = [
            'Desarrollo inmobiliario' => '/img/services/desarrollo-inmobiliario.webp',
            'Saneamiento físico legal y consultoría urbana' => '/img/services/saneamiento-legal.webp',
            'Diseño urbano' => '/img/services/diseno-urbano.webp',
            'Supervisión y ejecución de obras' => '/img/services/supervision-obras.webp',
            'Consultoría técnica' => '/img/services/consultoria-tecnica.webp',
            'Implementación BIM' => '/img/services/implementacion-bim.webp',
            'Materiales sostenibles' => '/img/services/materiales-sostenibles.webp',
            'Alianzas estratégicas' => '/img/services/alianzas-estrategicas.webp',
        ];

        foreach ($defaultImages as $serviceName => $imageUrl) {
            DB::table('services')
                ->where('name', $serviceName)
                ->whereNull('image_url')
                ->update(['image_url' => $imageUrl]);
        }
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });
    }
};
