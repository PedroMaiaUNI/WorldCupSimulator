import re

INPUT_FILE = "tabela.txt"
OUTPUT_FILE = "saida.json"

# colunas fixas do padrão
COLUNAS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"]

def limpar_letra(token):
    """Remove ''' e espaços"""
    token = token.strip()
    token = token.replace("'", "")
    return token

def processar_linha(numero, linha):
    partes = linha.split("|")

    letras = []
    valores = []

    for p in partes:
        p = p.strip()

        if "'''" in p:
            letra = limpar_letra(p)
            letras.append(letra)

        elif re.match(r'\d+[A-Z]', p):
            valores.append(p)

    chave = "".join(letras)

    if len(valores) != 8:
        return None

    mapeamento = {}

    for col, val in zip(COLUNAS, valores):
        mapeamento[col] = val

    return numero, chave, mapeamento


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        linhas = f.readlines()

    resultados = []

    for i in range(len(linhas)):
        if "! scope=\"row\"" in linhas[i]:
            numero = re.findall(r'\d+', linhas[i])[0]
            linha_dados = linhas[i+1]

            resultado = processar_linha(numero, linha_dados)

            if resultado:
                resultados.append(resultado)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for numero, chave, mapa in resultados:
            f.write(f'// Option {numero}: {chave}\n')
            f.write(f'"{chave}": {{ ')

            pares = []
            for k, v in mapa.items():
                pares.append(f'"{k}":"{v}"')

            f.write(",".join(pares))
            f.write(" },\n\n")

    print("Arquivo gerado com sucesso!")


if __name__ == "__main__":
    main()