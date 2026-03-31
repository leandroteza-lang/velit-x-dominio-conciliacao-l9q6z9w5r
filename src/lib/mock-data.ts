export const getMockData = (type: string): string[][] => {
  switch (type) {
    case 'plano':
      return Array.from({ length: 10 }).map((_, i) => [
        `1.0.${i + 1}`,
        `Ativo`,
        `Conta Teste ${i + 1}`,
        `Descrição da Conta Teste ${i + 1}`,
        `1.X.X`,
      ])
    case 'balancete_dominio':
      return Array.from({ length: 10 }).map((_, i) => [
        `1.0.${i + 1}`,
        `Ativo`,
        `R$ ${(1000 + i * 150).toFixed(2)}`,
        `R$ ${(500 + i * 50).toFixed(2)}`,
        `R$ ${(200 + i * 20).toFixed(2)}`,
        `R$ ${(1300 + i * 180).toFixed(2)}`,
      ])
    case 'balancete_velit':
      return Array.from({ length: 10 }).map((_, i) => [
        `1.0.${i + 1}`,
        `Conta Teste ${i + 1}`,
        `R$ ${(1000 + i * 150).toFixed(2)}`,
        `R$ ${(500 + i * 50).toFixed(2)}`,
        `R$ ${(200 + i * 20).toFixed(2)}`,
        `R$ ${(1300 + i * 180).toFixed(2)}`,
      ])
    case 'conciliacao':
      return [
        ['1.0.1', 'Conta Teste 1', 'R$ 1300.00', 'R$ 1300.00', 'R$ 0.00', 'OK'],
        ['1.0.2', 'Conta Teste 2', 'R$ 1480.00', 'R$ 1400.00', 'R$ 80.00', 'Divergência'],
        ['1.0.3', 'Conta Teste 3', 'R$ 0.00', 'R$ 1660.00', 'R$ -1660.00', 'Sem Conta'],
        ['1.0.4', 'Conta Teste 4', 'R$ 1840.00', 'R$ 1840.00', 'R$ 0.00', 'OK'],
        ['1.0.5', 'Conta Teste 5', 'R$ 2020.00', 'R$ 2020.00', 'R$ 0.00', 'OK'],
        ['1.0.6', 'Conta Teste 6', 'R$ 2200.00', 'R$ 2200.00', 'R$ 0.00', 'OK'],
        ['1.0.7', 'Conta Teste 7', 'R$ 2380.00', 'R$ 2500.00', 'R$ -120.00', 'Divergência'],
        ['1.0.8', 'Conta Teste 8', 'R$ 2560.00', 'R$ 0.00', 'R$ 2560.00', 'Sem Conta'],
        ['1.0.9', 'Conta Teste 9', 'R$ 2740.00', 'R$ 2740.00', 'R$ 0.00', 'OK'],
        ['1.0.10', 'Conta Teste 10', 'R$ 2920.00', 'R$ 2920.00', 'R$ 0.00', 'OK'],
      ]
    case 'razao_dominio':
    case 'razao_velit':
      return Array.from({ length: 10 }).map((_, i) => [
        `1.0.${i + 1}`,
        `0${(i % 9) + 1}/10/2023`,
        `Histórico de Lançamento ${i + 1}`,
        `R$ ${(500 + i * 50).toFixed(2)}`,
        `R$ ${(200 + i * 20).toFixed(2)}`,
        `R$ ${(1300 + i * 180).toFixed(2)}`,
      ])
    default:
      return []
  }
}
