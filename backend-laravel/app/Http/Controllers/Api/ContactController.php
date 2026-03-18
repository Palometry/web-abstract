<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ContactFormMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'fullName' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc,dns', 'max:180'],
            'phone' => ['required', 'string', 'max:40'],
            'message' => ['required', 'string', 'max:4000'],
        ], [
            'fullName.required' => 'El nombre es obligatorio.',
            'email.required' => 'El correo es obligatorio.',
            'email.email' => 'El correo no es valido.',
            'phone.required' => 'El celular es obligatorio.',
            'message.required' => 'El mensaje es obligatorio.',
        ]);

        $recipient = config('mail.contact_recipient.address');
        $recipientName = config('mail.contact_recipient.name');

        if (!$recipient) {
            Log::error('Contact form recipient not configured.');
            return response()->json([
                'message' => 'El destinatario del formulario no esta configurado.'
            ], 500);
        }

        try {
            Mail::to($recipient, $recipientName)->send(new ContactFormMail($validated));
        } catch (\Throwable $exception) {
            Log::error('Contact form mail send failed', [
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'No se pudo enviar el mensaje en este momento.'
            ], 502);
        }

        return response()->json([
            'message' => 'Tu mensaje fue enviado correctamente.'
        ]);
    }
}
