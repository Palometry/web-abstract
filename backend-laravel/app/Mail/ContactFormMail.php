<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactFormMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $contact;

    public function __construct(array $contact)
    {
        $this->contact = $contact;
    }

    public function build()
    {
        $fullName = trim((string) ($this->contact['fullName'] ?? 'Cliente'));

        return $this
            ->replyTo(
                (string) ($this->contact['email'] ?? config('mail.from.address')),
                $fullName
            )
            ->subject('Nuevo mensaje de contacto web: ' . $fullName)
            ->view('emails.contact');
    }
}
