import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";
import Hero from "@/components/homepage/Hero";
import Intro from "@/components/homepage/Intro";
import Products from "@/components/homepage/Products";
import Features from "@/components/homepage/Features";
import Process from "@/components/homepage/Process";
import CTA from "@/components/homepage/CTA";

import { getPostLoginPath } from "@/lib/authRouting";
import { getStoredUser } from "@/lib/authStorage";
import { productService } from "@/services/productService";

import "@/styles/homepage.css";

export default function HomePage() {
  const location = useLocation();
  const user = getStoredUser();
  const redirectPath = user ? getPostLoginPath(user.role) : null;
  const shouldRedirect = Boolean(redirectPath && location.pathname !== redirectPath);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shouldRedirect) return;

    const loadProducts = async () => {
      try {
        const data = await productService.getAll();
        setProducts(data);
      } catch (err) {
        console.error("Load products error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [shouldRedirect]);

  if (shouldRedirect) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <MainLayout>

      <Hero />

      <Intro />

      <Products products={products} loading={loading} />

      <Features />

      <Process />

      <CTA />

    </MainLayout>
  );
}
