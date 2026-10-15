// Ferramentas usadas só nos testes automatizados (o app não importa nada daqui).
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';

// Renderiza um hook dentro de um componente de teste e deixa ler o resultado mais recente.
// "envolver" coloca o componente dentro de um provedor (ex: AuthProvider), se precisar.
export function renderHook<P, R>(
  hook: (props: P) => R,
  props: P,
  envolver: (filho: React.ReactElement) => React.ReactElement = (filho) => filho
) {
  const result = {} as { current: R };
  function Sonda({ p }: { p: P }) {
    result.current = hook(p);
    return null;
  }

  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(envolver(<Sonda p={props} />));
  });

  return {
    result,
    rerender: (novas: P) =>
      act(() => {
        renderer.update(envolver(<Sonda p={novas} />));
      }),
    unmount: () => act(() => renderer.unmount()),
  };
}

// Deixa as promessas pendentes (ex: respostas simuladas da API) terminarem
export async function esperarRespostas() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
