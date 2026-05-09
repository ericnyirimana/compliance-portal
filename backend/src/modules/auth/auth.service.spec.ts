import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
};

const mockRefreshTokenRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verifyAsync: jest.fn(),
};

describe('AuthService', () => {
  let svc: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();
    svc = module.get(AuthService);
  });

  describe('register', () => {
    it('registers a new user and returns tokens', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const savedUser = { id: 'u1', email: 'a@test.com', role: UserRole.APPLICANT } as User;
      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const result = await svc.register({ email: 'a@test.com', password: 'Password1!' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws ConflictException when email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'u1' });
      await expect(svc.register({ email: 'a@test.com', password: 'Password1!' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(svc.login({ email: 'x@test.com', password: 'pw' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await argon2.hash('correct', { type: argon2.argon2id });
      mockUserRepo.findOne.mockResolvedValue({ id: 'u1', passwordHash: hash, isActive: true } as User);
      await expect(svc.login({ email: 'a@test.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      const hash = await argon2.hash('Password1!', { type: argon2.argon2id });
      const user = { id: 'u1', email: 'a@test.com', role: UserRole.APPLICANT, passwordHash: hash, isActive: true } as User;
      mockUserRepo.findOne.mockResolvedValue(user);
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});
      const result = await svc.login({ email: 'a@test.com', password: 'Password1!' });
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException on invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(svc.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token not found in DB', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'a@test.com', role: UserRole.APPLICANT });
      mockRefreshTokenRepo.findOne.mockResolvedValue(null);
      await expect(svc.refresh('valid-jwt')).rejects.toThrow(UnauthorizedException);
    });
  });
});
