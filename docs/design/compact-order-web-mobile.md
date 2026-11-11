# Compact gas ordering design

The approved screenshot sets the layout; the backend sets every displayed price,
fee, area and capacity. The existing homepage photograph, headline, links and
navigation remain in place. The hero card uses a compact icon/title, two-price
strip, capacity selector, editable kilogram stepper, delivery area and one-line
house address. The full gas-order page retains the structured address form,
multiple cylinders, staged appointments, payment and order review.

Native customer GasOrder uses the same hierarchy with theme-aware expandable
capacity and area pickers, 44px controls and an editable address that pre-fills
the existing checkout form. The existing Services screen is linked. Neither
driver nor technician receives the customer form.

Both clients step along the integer-gram grid enforced by gasLine. Changing
capacity retains the amount for review and cannot silently increase it. The
current branch policy determines increments; a 12.5 kg cylinder does not imply
a 12.5 kg purchase. Fractional kobo are not lost by whole-naira formatting.

The optional location-scoped gas.quote preflight validates active coverage,
delivery enabled and current unreserved LPG; it does not reserve stock. Checkout
continues to revalidate prices, stock, customer, capacity and delivery policy
in its existing transaction. Same-delivery addition rules are unchanged.
