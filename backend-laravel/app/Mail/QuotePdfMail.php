<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class QuotePdfMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $quote;

    private string $pdfContent;

    public function __construct(array $quote, string $pdfContent)
    {
        $this->quote = $quote;
        $this->pdfContent = $pdfContent;
    }

    public function build()
    {
        $clientName = trim((string) ($this->quote['fullName'] ?? ''));
        $documentId = trim((string) ($this->quote['documentNumber'] ?? ''));
        $suffix = $documentId !== '' ? $documentId : ('ID ' . $this->quote['id']);
        $subject = 'Cotizacion de Abstract Arquitectura para ' . ($clientName ?: 'cliente') . ' ' . $suffix;

        return $this->from('dazanelson8@gmail.com', 'ArquiNelson')
            ->subject($subject)
            ->view('emails.quote')
            ->attachData($this->pdfContent, 'cotizacion-' . $this->quote['id'] . '.pdf', [
                'mime' => 'application/pdf'
            ]);
    }
}
