import { useEffect, useState } from "react";

import MainLayout from "@/layouts/MainLayout";
import Hero from "@/components/homepage/Hero";
import Intro from "@/components/homepage/Intro";
import Products from "@/components/homepage/Products";
import Features from "@/components/homepage/Features";
import Process from "@/components/homepage/Process";
import CTA from "@/components/homepage/CTA";

import { productService } from "@/services/productService";

import "@/styles/homepage.css";

export default function HomePage() {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

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