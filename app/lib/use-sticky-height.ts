import { type RefObject, useEffect } from "react";

/**
 * 固定した要素（ヘッダ・送信フォーム）の高さを、CSS 変数としてルート要素に入れておく。
 * サイトヘッダ（管理者モードの帯で高さが変わる）の下に卓ヘッダを固定する位置、
 * scrollIntoView でヘッダの裏に隠れないようにする scroll-padding-top、
 * 送信フォームに隠れないようにするページの下の余白に使う
 * @param name CSS 変数名（"--site-header-height" など）
 */
export const useStickyHeight = (ref: RefObject<HTMLElement | null>, name: string) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty(name, `${el.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(name);
    };
  }, [ref, name]);
};
