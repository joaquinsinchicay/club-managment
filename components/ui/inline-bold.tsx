import { Fragment } from "react";

type InlineBoldProps = {
  text: string;
};

export function InlineBold({ text }: InlineBoldProps) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
