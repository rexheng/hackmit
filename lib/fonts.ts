import { Monoton, Mr_Dafoe, Source_Serif_4, Special_Elite, Teko } from "next/font/google";

export const monoton = Monoton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-monoton",
});

export const teko = Teko({
  subsets: ["latin"],
  variable: "--font-teko",
});

export const dafoe = Mr_Dafoe({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dafoe",
});

export const elite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-elite",
});

export const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const fontClassName = [
  monoton.variable,
  teko.variable,
  dafoe.variable,
  elite.variable,
  serif.variable,
].join(" ");
