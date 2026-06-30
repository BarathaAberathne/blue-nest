package sourcing

import "testing"

// A trimmed-down sample of the Magento markup Gompels uses for a results item.
const gompelsFixture = `
<ol class="products list items product-items">
  <li class="item product product-item">
    <div class="product name product-item-name"><a class="product-item-link" href="/good-baby-nappies-80-pack.html">Good Baby Nappies Size 4 Maxi 80 Pack</a></div>
    <div class="sku">Code: 56358</div>
    <span class="price">£11.10</span>
  </li>
  <li class="item product product-item">
    <div class="product name product-item-name"><a class="product-item-link" href="/pampers-x.html">Pampers Baby-Dry Size 5 72 Pack</a></div>
    <div class="sku">Code: 56359</div>
    <span class="price">£1,234.56</span>
  </li>
</ol>`

func TestParseGompelsResults(t *testing.T) {
	offers := ParseGompelsResults(gompelsFixture)
	if len(offers) != 2 {
		t.Fatalf("expected 2 offers, got %d (%+v)", len(offers), offers)
	}
	if offers[0].Code != "56358" || offers[0].Price != 1110 {
		t.Errorf("offer[0] = %+v, want code 56358 price 1110", offers[0])
	}
	if offers[0].Supplier != "Gompels" {
		t.Errorf("offer[0].Supplier = %q, want Gompels", offers[0].Supplier)
	}
	if offers[1].Code != "56359" || offers[1].Price != 123456 {
		t.Errorf("offer[1] = %+v, want code 56359 price 123456", offers[1])
	}
}
