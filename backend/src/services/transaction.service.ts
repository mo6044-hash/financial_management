import prisma from "../database/prisma";


export async function createTransaction(
    accountId: string, 
    amount: number,
    description: string,
    source: string,
    transactionDate = new Date()
) {
    return prisma.transaction.create({
        data: {
            account_id: accountId,
            amount,
            description,
            source,
            transaction_date: transactionDate,
        }
    });
}

export async function getTransactionsForAccount(accountId: string) {
    return prisma.transaction.findMany({
        where: {
            account_id: accountId,
            deleted_at: null,
        },
        orderBy: {
            transaction_date: "desc",
        },
    });
}

export async function getAccountBalance(accountId: string) {
    const result = await prisma.transaction.aggregate({
        where: {
            account_id: accountId,
            deleted_at: null,
        },
        _sum: {
            amount: true,
        },
    });
    return result._sum.amount ?? 0;
}