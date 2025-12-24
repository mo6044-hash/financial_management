import prisma from "../database/prisma";

export async function createAccount(
    userId: string,
    name: string,
    type: string,
    currency: string,
    institution?: string,
){
    return prisma.account.create({
        data: {
            user_id: userId,
            account_name: name,
            account_type: type,
            institution: institution,
            currency: currency,
        }
    });
}

export async function getAccountsForUser(userId: string) {
    return prisma.account.findMany({
        where: {
            user_id: userId,
            deleted_at: null,
        }
    });
}

export async function deactivateAccount(accountId: string) {
    return prisma.account.update({
       where: {
        account_id: accountId,
       },
       data: {
        is_active: false,
       }
    })
}