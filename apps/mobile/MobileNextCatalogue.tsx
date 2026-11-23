import React, { useState } from "react";
import { View, Pressable, Image } from "react-native";
import {
  NextIntro,
  NextText,
  NextField,
  NextCard,
  NextList,
  NextRow,
  NextButton,
  NextEmpty,
  NextChoice,
  NextIcon,
  useNextDock,
} from "./MobileNextUI";
import { ContextSheet } from "./ContextSheet";
import { useTheme } from "./theme";
import { money } from "./CustomerUI";
export function NextCatalogue({
  products,
  categories,
  onSelect,
  onCart,
  cartCount,
  art,
}: any) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [picker, setPicker] = useState(false);
  const rows = products.filter(
    (p: any) =>
      (category === "All" || p.category === category) &&
      (p.name + " " + p.sku).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <View style={{ gap: 18 }}>
      <NextIntro
        title={"Good things,\nfor your kitchen."}
        detail="Compare current products and availability."
      />
      <NextField
        label="Search products"
        value={query}
        onChange={setQuery}
        placeholder="Cylinders, cookers and essentials"
      />
      <NextChoice
        label="Category"
        value={category}
        onPress={() => setPicker(true)}
      />
      {cartCount > 0 && (
        <NextRow
          icon="package"
          title={"View cart · " + cartCount + " items"}
          onPress={onCart}
        />
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {rows.map((p: any) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={"View " + p.name}
            onPress={() => onSelect(p)}
            style={{ flexBasis: "46%", flexGrow: 1, minWidth: 130 }}
          >
            <NextCard>
              {art(p)}
              <NextText kind="label">{p.name}</NextText>
              <NextText kind="heading">{money(p.price_kobo)}</NextText>
              <NextText kind="small">
                {p.available && p.published
                  ? "Available"
                  : "Availability pending"}
              </NextText>
            </NextCard>
          </Pressable>
        ))}
      </View>
      {!rows.length && (
        <NextEmpty
          title="No matching products"
          detail="Try another category or search."
        />
      )}
      {picker && (
        <ContextSheet title="Product category" onClose={() => setPicker(false)}>
          <NextList>
            {["All", ...categories].map((c: string) => (
              <NextRow
                key={c}
                title={c}
                onPress={() => {
                  setCategory(c);
                  setPicker(false);
                }}
              />
            ))}
          </NextList>
        </ContextSheet>
      )}
    </View>
  );
}
export function NextProduct({
  product,
  products,
  art,
  origin,
  onSelect,
  onAdd,
  compatibility,
}: any) {
  const [sheet, setSheet] = useState(false);
  const variants = products.filter(
    (v: any) =>
      (product.parent_id
        ? v.parent_id === product.parent_id || v.id === product.parent_id
        : v.parent_id === product.id) && v.id !== product.id,
  );
  useNextDock({
    total: money(product.price_kobo),
    label: product.category === "Gas refills" ? "Choose refill" : "Add to cart",
    disabled: !product.published || !product.available || !product.price_kobo,
    onPress: onAdd,
  });
  return (
    <View style={{ gap: 20 }}>
      {art(product, true)}
      <NextIntro title={product.name} detail={product.description} />
      <NextText kind="heading">{money(product.price_kobo)}</NextText>
      <NextList>
        {variants.map((v: any) => (
          <NextRow
            key={v.id}
            title={v.name}
            detail={money(v.price_kobo)}
            onPress={() => onSelect(v)}
          />
        ))}
        <NextRow
          icon="clipboard-list"
          title="Specifications & care"
          detail="Compatibility, warranty and safety"
          onPress={() => setSheet(true)}
        />
      </NextList>
      {product.images?.slice(1).map((i: any) => (
        <Image
          key={i.id}
          source={{ uri: origin + "/api/media/" + i.id }}
          accessibilityLabel={i.alt}
          style={{ width: "100%", height: 220, resizeMode: "contain" }}
        />
      ))}
      {sheet && (
        <ContextSheet title="Product details" onClose={() => setSheet(false)}>
          <NextText>SKU: {product.sku}</NextText>
          {!!product.attributes?.specifications && (
            <NextText>{product.attributes.specifications}</NextText>
          )}
          {!!product.attributes?.warranty && (
            <NextText>{product.attributes.warranty}</NextText>
          )}
          {product.attributes?.installationRequired && (
            <NextText>Professional installation required.</NextText>
          )}
          <NextText>{product.safety}</NextText>
          {compatibility}
        </ContextSheet>
      )}
    </View>
  );
}
export function NextCart({
  cart,
  products,
  setCart,
  art,
  onCheckout,
  onBrowse,
}: any) {
  const { colors } = useTheme();
  const total = cart.reduce(
    (n: number, i: any) =>
      n +
      Number(products.find((p: any) => p.id === i.productId)?.price_kobo || 0) *
        i.quantity,
    0,
  );
  useNextDock(
    cart.length
      ? {
          total: money(total),
          label: "Delivery details",
          disabled: cart.some(
            (i: any) =>
              !products.find((p: any) => p.id === i.productId)?.available ||
              !Number.isInteger(i.quantity) ||
              i.quantity < 1 ||
              i.quantity >
                Math.min(
                  20,
                  Number(
                    products.find((p: any) => p.id === i.productId)
                      ?.available ?? 0,
                  ),
                ),
          ),
          onPress: onCheckout,
        }
      : null,
  );
  function quantity(id: string, n: number) {
    setCart(
      cart
        .map((i: any) => (i.productId === id ? { ...i, quantity: n } : i))
        .filter((i: any) => i.quantity > 0),
    );
  }
  return (
    <View style={{ gap: 18 }}>
      <NextIntro
        title={"Your essentials,\nready to go."}
        detail="Review items. Delivery is confirmed at checkout."
      />
      {cart.map((i: any) => {
        const p = products.find((p: any) => p.id === i.productId);
        return (
          <NextCard key={i.productId}>
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View style={{ width: 76 }}>
                {p ? art(p) : <NextIcon name="package" />}
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <NextText kind="label">
                  {p?.name || "Unavailable product"}
                </NextText>
                <NextText>
                  {p ? money(p.price_kobo) : "Review availability"}
                </NextText>
                {i.quantity > Math.min(20, Number(p?.available ?? 0)) && (
                  <NextText kind="small">
                    Reduce quantity to available stock, up to 20 per item.
                  </NextText>
                )}
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <NextButton
                secondary
                compact
                label="Remove"
                onPress={() => quantity(i.productId, 0)}
              />
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"Reduce " + (p?.name || "item")}
                  onPress={() => quantity(i.productId, i.quantity - 1)}
                  style={{
                    minHeight: 48,
                    minWidth: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <NextIcon name="minus" />
                </Pressable>
                <NextText kind="label">{i.quantity}</NextText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"Increase " + (p?.name || "item")}
                  disabled={
                    i.quantity >= Math.min(20, Number(p?.available ?? 0))
                  }
                  onPress={() => quantity(i.productId, i.quantity + 1)}
                  style={{
                    minHeight: 48,
                    minWidth: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <NextIcon name="plus" />
                </Pressable>
              </View>
            </View>
          </NextCard>
        );
      })}
      {!cart.length && (
        <NextEmpty
          title="Your cart is empty"
          detail="Find something useful for your kitchen."
          action={<NextButton label="Explore products" onPress={onBrowse} />}
        />
      )}
    </View>
  );
}
