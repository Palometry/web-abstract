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
        $subject = 'Cotización #' . $this->quote['id'] . ' - ' . ($this->quote['projectName'] ?? '');

        return $this->from('dazanelson8@gmail.com', 'ArquiNelson')
            ->subject($subject)
            ->view('emails.quote')
            ->attachData($this->pdfContent, 'cotizacion-' . $this->quote['id'] . '.pdf', [
                'mime' => 'application/pdf'
            ]);
    }
}
