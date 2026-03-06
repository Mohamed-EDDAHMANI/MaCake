import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Redirect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchCategories, fetchProducts } from "@/store/features/catalog";
import { fileUriToBase64, guessMimeType } from "@/lib/file-utils";
import { api } from "@/lib/axios";
import {
  PRIMARY,
  PRIMARY_TINT,
  BACKGROUND_LIGHT,
  SLATE_400,
  SLATE_500,
  TEXT_PRIMARY,
  BORDER,
  SURFACE,
} from "@/constants/colors";

const STATIC_CATEGORIES = ["Birthday", "Wedding", "Chocolate", "Vegan", "Fruit", "Custom"];

export default function CreateProductScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { categories: apiCategories, categoriesLoading } = useAppSelector((s) => s.catalog);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("Birthday");
  const [images, setImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [publishing, setPublishing] = useState(false);

  /* ─── fetch categories via Redux ─── */
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProducts());
  }, [dispatch]);

  /* ─── merge static + API categories, deduplicate ─── */
  const categories = useMemo(() => {
    const apiNames = apiCategories.map((c) => c.name);
    return [...new Set([...STATIC_CATEGORIES, ...apiNames])];
  }, [apiCategories]);

  /* ─── image picker ─── */
  const pickImage = useCallback(
    async (index?: number) => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Gallery access is needed to add photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: index === undefined,
        selectionLimit: index === undefined ? 5 - images.length : 1,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        if (index !== undefined) {
          setImages((prev) => {
            const next = [...prev];
            next[index] = result.assets[0].uri;
            return next;
          });
        } else {
          setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
        }
      }
    },
    [images.length],
  );

  /* ─── guard (after all hooks) ─── */
  if (!isAuthenticated || user?.role !== "PATISSIERE") {
    return <Redirect href="/(main)" />;
  }

  /* ─── ingredients ─── */
  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
    }
    setIngredientInput("");
  };

  const removeIngredient = (i: number) => setIngredients((prev) => prev.filter((_, idx) => idx !== i));

  /* ─── publish ─── */
  const handlePublish = async () => {
    if (!title.trim()) return Alert.alert("Required", "Please enter a product title.");
    if (!price.trim() || isNaN(Number(price))) return Alert.alert("Required", "Please enter a valid price.");
    if (!selectedCategory) return Alert.alert("Required", "Please select a category.");

    setPublishing(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        isActive,
        categoryName: selectedCategory,
        patissiereId: user?.id,
        ingredients,
      };
      if (images.length > 0) {
        const base64Images: string[] = [];
        const mimeTypes: string[] = [];
        for (const uri of images) {
          const b64 = await fileUriToBase64(uri);
          if (b64) {
            base64Images.push(b64);
            mimeTypes.push(guessMimeType(uri));
          }
        }
        if (base64Images.length > 0) {
          payload.images = base64Images;
          payload.imagesMimeTypes = mimeTypes;
        }
      }

      await api.post("/s2/product/create", payload);
      Alert.alert("Success", "Your product has been published!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to publish. Try again.");
    } finally {
      setPublishing(false);
    }
  };

  /* ─── helpers ─── */
  const filledSlots = images.length;
  const emptySmall = Math.max(0, 2 - Math.max(0, filledSlots - 1));
  const emptyWide = Math.max(0, 2 - Math.max(0, filledSlots - 3));

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* ── Header ── */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: `${PRIMARY}1A`, backgroundColor: "rgba(255,255,255,0.8)" }}
      >
        <Pressable
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: `${PRIMARY}14` }}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900 flex-1 text-center pr-10">
          Add New Product
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="p-4" style={{ gap: 24 }}>
            {/* ═══ Upload Images ═══ */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-slate-900">Upload Images</Text>
                <Text className="text-sm font-medium" style={{ color: PRIMARY }}>
                  {filledSlots} / 5 Photos
                </Text>
              </View>

              {/* Grid: main (2/3) + 2 small right */}
              <View style={{ gap: 8 }}>
                <View className="flex-row" style={{ gap: 8 }}>
                  {/* Main big slot */}
                  <Pressable
                    onPress={() => (images[0] ? pickImage(0) : pickImage())}
                    className="flex-[2] rounded-xl overflow-hidden border-2 border-dashed items-center justify-center"
                    style={{
                      aspectRatio: 1,
                      borderColor: `${PRIMARY}4D`,
                      backgroundColor: `${PRIMARY}0D`,
                    }}
                  >
                    {images[0] ? (
                      <View className="w-full h-full">
                        <Image source={{ uri: images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                          <MaterialIcons name="add-a-photo" size={36} color="#fff" />
                        </View>
                      </View>
                    ) : (
                      <>
                        <MaterialIcons name="add-a-photo" size={36} color={PRIMARY} />
                        <Text className="text-sm font-medium mt-1" style={{ color: PRIMARY }}>
                          Main Photo
                        </Text>
                      </>
                    )}
                  </Pressable>

                  {/* Small right column */}
                  <View className="flex-1" style={{ gap: 8 }}>
                    {[1, 2].map((idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => (images[idx] ? pickImage(idx) : pickImage())}
                        className="flex-1 rounded-xl overflow-hidden items-center justify-center border"
                        style={{ borderColor: `${PRIMARY}1A`, backgroundColor: BACKGROUND_LIGHT }}
                      >
                        {images[idx] ? (
                          <Image source={{ uri: images[idx] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        ) : (
                          <MaterialIcons name="image" size={22} color={SLATE_400} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Wide bottom slots */}
                <View className="flex-row" style={{ gap: 8 }}>
                  {[3, 4].map((idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => (images[idx] ? pickImage(idx) : pickImage())}
                      className="flex-1 rounded-xl overflow-hidden items-center justify-center border"
                      style={{ aspectRatio: 16 / 9, borderColor: `${PRIMARY}1A`, backgroundColor: BACKGROUND_LIGHT }}
                    >
                      {images[idx] ? (
                        <Image source={{ uri: images[idx] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <MaterialIcons name="image" size={22} color={SLATE_400} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* ═══ Product Title ═══ */}
            <View style={{ gap: 8 }}>
              <Text className="text-sm font-bold uppercase text-slate-900" style={{ letterSpacing: 1 }}>
                Product Title
              </Text>
              <TextInput
                className="rounded-xl text-base text-slate-900"
                style={[s.input, { borderColor: `${PRIMARY}1A`, backgroundColor: BACKGROUND_LIGHT }]}
                placeholder="e.g. Raspberry Velour Mousse Cake"
                placeholderTextColor={SLATE_400}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* ═══ Category ═══ */}
            <View style={{ gap: 8 }}>
              <Text className="text-sm font-bold uppercase text-slate-900" style={{ letterSpacing: 1 }}>
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setSelectedCategory(active ? null : cat)}
                      className="rounded-full"
                      style={[
                        { paddingHorizontal: 20, paddingVertical: 10 },
                        active
                          ? { backgroundColor: PRIMARY, borderWidth: 1, borderColor: PRIMARY }
                          : { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
                      ]}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: active ? "#fff" : SLATE_500 }}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ═══ Price ═══ */}
            <View style={{ gap: 8 }}>
              <Text className="text-sm font-bold uppercase text-slate-900" style={{ letterSpacing: 1 }}>
                Price
              </Text>
              <View className="relative">
                <Text
                  className="absolute font-bold"
                  style={{ left: 16, top: 18, color: SLATE_500, zIndex: 1 }}
                >
                  $
                </Text>
                <TextInput
                  className="rounded-xl text-base text-slate-900"
                  style={[s.input, { paddingLeft: 32, borderColor: `${PRIMARY}1A`, backgroundColor: BACKGROUND_LIGHT }]}
                  placeholder="0.00"
                  placeholderTextColor={SLATE_400}
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            {/* ═══ Description ═══ */}
            <View style={{ gap: 8 }}>
              <Text className="text-sm font-bold uppercase text-slate-900" style={{ letterSpacing: 1 }}>
                Description
              </Text>
              <TextInput
                className="rounded-xl text-base text-slate-900"
                style={[
                  s.input,
                  { minHeight: 130, textAlignVertical: "top", paddingTop: 14, borderColor: `${PRIMARY}1A`, backgroundColor: BACKGROUND_LIGHT },
                ]}
                placeholder="Describe the flavors, texture, and special touches..."
                placeholderTextColor={SLATE_400}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* ═══ Ingredients ═══ */}
            <View style={{ gap: 8 }}>
              <Text className="text-sm font-bold uppercase text-slate-900" style={{ letterSpacing: 1 }}>
                Ingredients
              </Text>
              <View
                className="rounded-xl border p-3"
                style={{ borderColor: `${PRIMARY}1A`, backgroundColor: BACKGROUND_LIGHT, minHeight: 56 }}
              >
                <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                  {ingredients.map((ing, i) => (
                    <View
                      key={i}
                      className="flex-row items-center rounded-full px-3 py-1.5"
                      style={{
                        backgroundColor: `${PRIMARY}1A`,
                        borderWidth: 1,
                        borderColor: `${PRIMARY}33`,
                        gap: 4,
                      }}
                    >
                      <Text className="text-sm font-medium" style={{ color: PRIMARY }}>
                        {ing}
                      </Text>
                      <Pressable onPress={() => removeIngredient(i)} hitSlop={8}>
                        <MaterialIcons name="close" size={14} color={PRIMARY} />
                      </Pressable>
                    </View>
                  ))}
                  <TextInput
                    className="flex-1 text-sm"
                    style={{ minWidth: 120, color: TEXT_PRIMARY, paddingVertical: 4 }}
                    placeholder="Add ingredient..."
                    placeholderTextColor={SLATE_400}
                    value={ingredientInput}
                    onChangeText={setIngredientInput}
                    onSubmitEditing={addIngredient}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>

            {/* ═══ Active Status ═══ */}
            <View
              className="flex-row items-center justify-between px-4 py-4 rounded-xl border"
              style={{ borderColor: `${PRIMARY}0D`, backgroundColor: BACKGROUND_LIGHT }}
            >
              <View>
                <Text className="font-bold text-slate-900">Active Status</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Visible to customers in marketplace</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: BORDER, true: PRIMARY }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Publish Button ── */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 border-t"
        style={{ backgroundColor: "rgba(255,255,255,0.92)", borderTopColor: `${PRIMARY}1A` }}
      >
        <Pressable
          className="w-full flex-row items-center justify-center rounded-xl"
          style={[
            { height: 56, backgroundColor: publishing ? `${PRIMARY}99` : PRIMARY, gap: 8 },
            s.publishShadow,
          ]}
          onPress={handlePublish}
          disabled={publishing}
        >
          {publishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="publish" size={22} color="#fff" />
              <Text className="text-white font-bold text-base">Publish Product</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  publishShadow: {
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
});
