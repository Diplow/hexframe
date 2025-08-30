'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { IAMService } from '~/lib/domains/iam/services/iam.service';
import { BetterAuthUserRepository } from '~/lib/domains/iam/infrastructure';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { MappingService } from '~/lib/domains/mapping/services/mapping.service';
import { DbMapItemRepository, DbBaseItemRepository } from '~/lib/domains/mapping/infrastructure';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function loginAction(data: z.infer<typeof loginSchema>) {
  try {
    const validatedData = loginSchema.parse(data);
    
    // Create IAM service with repository
    const repositories = {
      user: new BetterAuthUserRepository(auth, db),
    };
    const iamService = new IAMService(repositories);
    
    const user = await iamService.login({
      email: validatedData.email,
      password: validatedData.password,
    });
    
    revalidatePath('/');
    
    return { success: true as const, userId: user.id };
  } catch (error) {
    console.error('Login action error:', error);
    if (error instanceof z.ZodError) {
      return { success: false as const, error: 'Invalid input' };
    }
    if (error instanceof Error) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: 'Login failed' };
  }
}

export async function registerAction(data: z.infer<typeof registerSchema>) {
  try {
    const validatedData = registerSchema.parse(data);
    
    // Step 1: Create user via IAM domain
    const repositories = {
      user: new BetterAuthUserRepository(auth, db),
    };
    const iamService = new IAMService(repositories);
    
    const user = await iamService.register({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
    });
    
    console.log('[REGISTER ACTION] User created:', {
      userId: user.id,
      email: user.email,
      mappingId: user.mappingId,
    });
    
    // Step 2: Create default map for the user
    let defaultMapId: string | undefined;
    try {
      const repositories = {
        mapItem: new DbMapItemRepository(db),
        baseItem: new DbBaseItemRepository(db),
      };
      const mappingService = new MappingService(repositories);
      
      const map = await mappingService.maps.createMap({
        userId: user.mappingId,
        title: `${user.displayName}'s Space`,
        descr: "Your personal hexframe workspace",
      });
      defaultMapId = String(map.id);
      
      console.log('[REGISTER ACTION] Default map created:', defaultMapId);
    } catch (mapError) {
      // Log error but don't fail registration
      console.error('[REGISTER ACTION] Failed to create default map:', mapError);
    }
    
    // Note: We don't auto-login here anymore - the client will handle login after registration
    // This avoids cookie issues with server actions
    
    revalidatePath('/');
    
    return { 
      success: true as const, 
      userId: user.id,
      defaultMapId,
    };
  } catch (error) {
    console.error('Register action error:', error);
    if (error instanceof z.ZodError) {
      return { success: false as const, error: 'Invalid input' };
    }
    if (error instanceof Error) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: 'Registration failed' };
  }
}

