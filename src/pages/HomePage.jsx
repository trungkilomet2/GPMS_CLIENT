import MainLayout from "@/layouts/MainLayout";
import Hero     from "@/components/homepage/Hero";
import Intro    from "@/components/homepage/Intro";
import Products from "@/components/homepage/Products";
import Features from "@/components/homepage/Features";
import Process  from "@/components/homepage/Process";
import CTA      from "@/components/homepage/CTA";

import "@/styles/homepage.css";

export default function HomePage() {
  return (
    <MainLayout>
      <Hero />
      <Intro />
      <Products />
      <Features />
      <Process />
      <CTA />
    </MainLayout>
  );
}