import prisma from "../database/prisma";

export async function createUser(email: string, fullName: string) {
    return prisma.user.create({
        data: {
            email: email,
            full_name: fullName,
        }
    });
}

export async function getUserById(userId: string) {
    return prisma.user.findUnique({
        where: {
            id: userId,
        }
    }); //what if user doesnt exist 
}

export async function getUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: {
            email: email,
        }
    }); //what if user doesnt exist 
}

