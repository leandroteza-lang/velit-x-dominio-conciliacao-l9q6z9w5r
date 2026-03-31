export function getMockData(key: string): string[][] {
  const data: Record<string, string[][]> = {
    plano: Array.from({ length: 10 }).map((_, i) => [
      `1.0.${i + 1}`,
      'Ativo',
      `Conta Teste ${i + 1}`,
      `Descrição da conta ${i + 1}`,
      `1.0.${i + 1}.00.00`,
    ]),
    balancete_dominio: Array.from({ length: 10 }).map((_, i) => [
      `1.0.${i + 1}`,
      'Ativo',
      (1000 + i * 100).toFixed(2),
      (500 + i * 50).toFixed(2),
      (200 + i * 20).toFixed(2),
      (1300 + i * 130).toFixed(2),
    ]),
    balancete_velit: Array.from({ length: 10 }).map((_, i) => [
      `1.0.${i + 1}`,
      `Conta Teste ${i + 1}`,
      (1000 + i * 100).toFixed(2),
      (500 + i * 50).toFixed(2),
      (200 + i * 20).toFixed(2),
      (1300 + i * 130).toFixed(2),
    ]),
    conciliacao: [
      ['1.0.1', 'Conta Teste 1', '1300.00', '1300.00', '0.00', 'OK'],
      ['1.0.2', 'Conta Teste 2', '1430.00', '1430.00', '0.00', 'OK'],
      ['1.0.3', 'Conta Teste 3', '1560.00', '1500.00', '60.00', 'Divergência'],
      ['1.0.4', 'Conta Teste 4', '1690.00', '1690.00', '0.00', 'OK'],
      ['1.0.5', 'Conta Teste 5', '1820.00', '0.00', '1820.00', 'Sem Conta'],
      ['1.0.6', 'Conta Teste 6', '1950.00', '1950.00', '0.00', 'OK'],
      ['1.0.7', 'Conta Teste 7', '2080.00', '2100.00', '-20.00', 'Divergência'],
      ['1.0.8', 'Conta Teste 8', '2210.00', '2210.00', '0.00', 'OK'],
      ['1.0.9', 'Conta Teste 9', '0.00', '2340.00', '-2340.00', 'Sem Conta'],
      ['1.0.10', 'Conta Teste 10', '2470.00', '2470.00', '0.00', 'OK'],
    ],
    razao_dominio: Array.from({ length: 10 }).map((_, i) => [
      `1.0.${i + 1}`,
      `0${(i % 9) + 1}/10/2023`,
      `Histórico Domínio ${i + 1}`,
      (100 + i * 10).toFixed(2),
      (50 + i * 5).toFixed(2),
      (1000 + i * 100).toFixed(2),
    ]),
    razao_velit: Array.from({ length: 10 }).map((_, i) => [
      `1.0.${i + 1}`,
      `0${(i % 9) + 1}/10/2023`,
      `Histórico VELIT ${i + 1}`,
      (100 + i * 10).toFixed(2),
      (50 + i * 5).toFixed(2),
      (1000 + i * 100).toFixed(2),
    ]),
  }

  return data[key] || []
}
