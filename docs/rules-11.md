# Rules-11: combined brand impersonation evidence

DEV-962 extends the deterministic core using existing bounded `extractedText`
and `anchors` fields. The Inbox extracts anchors and inert text; the portable core also extracts text
from raw `html` for its existing statistical model, while retaining partial HTML status. No new dependency,
network, DNS, MIME, attachment, AI or storage capability was added to the scorer.

The new 45-point brand family requires an explicit supported sender display
identity, an unrelated sender domain, account/review/security lure wording, and
an unrelated HTTP action anchor. Supported identities initially cover
QuickBooks/Intuit and PayPal. Exact normalized hostname boundaries prevent suffix
lookalikes; a legitimate sender or brand-aligned target is a negative control,
not a global allow rule or authenticated identity. The core does not establish
the sender's authentication. Branding in discussion/forwarded text, newsletters,
ordinary tracking links and marketing-only messages do not trigger this rule.

One recognized HTTP redirect query value is parsed lexically. It is a sender's
claimed destination, not a fetched result. The outer hostname retains its existing visible-URL mismatch semantics; redirect hints apply only to brand detection. Ambiguous or nested wrapper parameters
produce a limit; there is no recursive decode, request, redirect follow or URL
reputation lookup. All input loops use the existing 100-link/2,048-byte bounds.
Existing family/global caps, static output reasons, completeness and preference
provenance remain enforced. The new brand family has its own cap of 45; total
output remains capped at 100. The score is not a probability.

RPC/schema 1 and engine 0.1.0 are unchanged. Scoring now emits `rules-11`.
Earlier versions remain reserved for their original reasons, and decoders reject
the new reason under earlier versions. Publish a compatible caller before the
scorer. The caller owns recoverable routing and can disable it in shadow mode.

Fixtures are original synthetic examples, not private emails. Actual workerd
RPC, denied outbound/native capability, schema, adversarial bounds, finite
output, mutation and legitimate negative-control checks remain release gates.
Synthetic coverage is not a real-mail accuracy measurement. English lure and
small explicit brand coverage are known limits, not a general phishing detector.

Primary domain evidence:

- [Intuit official domains and phishing guidance](https://quickbooks.intuit.com/learn-support/en-us/help-article/fraud/identify-suspicious-activity-phishing-scams-fraud/L2NzZQnZu_US_en_US)
- [PayPal phishing guidance](https://securepayments.paypal.com/us/cshelp/article/how-do-i-spot-a-fake-fraudulent-or-phishing-paypal-email-or-website-help164)
