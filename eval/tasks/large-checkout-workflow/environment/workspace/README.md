# Checkout Flow

This package contains the checkout orchestration for a small order service.

## Local Commands

```sh
npm test
```

## Runtime Notes

- `submitCheckout(request, services)` is the public entry point.
- Service adapters are passed in by the caller so the checkout path can run in tests
  without a network or database.
- The returned object is used by the HTTP layer and should remain stable.
