import { Controller, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Razorpay embedded checkout requires an HTTPS `callback_url` that accepts POST.
 * Custom schemes (dukaanpro://, exp://) are rejected with BAD_REQUEST_ERROR.
 * This endpoint receives Razorpay's POST and 302-redirects to the app return URL
 * with payment params (subscription is still activated only via verify API + HMAC).
 */
@Controller('api')
export class RazorpayBrowserCallbackController {
  @Post('razorpay-browser-callback')
  browserCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('return') returnUrl?: string,
  ): void {
    if (!returnUrl) {
      res.status(400).type('text/plain').send('Missing return URL');
      return;
    }

    let decodedReturn: string;
    try {
      decodedReturn = decodeURIComponent(returnUrl);
    } catch {
      res.status(400).type('text/plain').send('Invalid return URL encoding');
      return;
    }

    if (!this.isAllowedAppReturnUrl(decodedReturn)) {
      res.status(400).type('text/plain').send('Disallowed return URL');
      return;
    }

    const body = (req.body ?? {}) as Record<string, string>;
    const pid = body.razorpay_payment_id;
    const oid = body.razorpay_order_id;
    const sig = body.razorpay_signature;

    const parts: string[] = [];
    if (pid && oid && sig) {
      parts.push(`razorpay_payment_id=${encodeURIComponent(pid)}`);
      parts.push(`razorpay_order_id=${encodeURIComponent(oid)}`);
      parts.push(`razorpay_signature=${encodeURIComponent(sig)}`);
    } else {
      const code =
        body['error[code]'] ??
        body.error_code ??
        body.code ??
        'payment_cancelled';
      const desc =
        body['error[description]'] ??
        body.error_description ??
        body.description ??
        '';
      parts.push(`rzp_error=${encodeURIComponent(String(code))}`);
      if (desc) {
        parts.push(`rzp_error_desc=${encodeURIComponent(String(desc))}`);
      }
    }

    const sep = decodedReturn.includes('?') ? '&' : '?';
    const target = `${decodedReturn}${sep}${parts.join('&')}`;
    res.redirect(302, target);
  }

  /** Only deep links used by the Expo / dev client — blocks open redirects. */
  private isAllowedAppReturnUrl(url: string): boolean {
    if (!url || url.length > 2048) {
      return false;
    }
    const lower = url.toLowerCase();
    return (
      lower.startsWith('dukaanpro://') ||
      lower.startsWith('exp://') ||
      lower.startsWith('exps://') ||
      lower.startsWith('exp+')
    );
  }
}
