/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DecryptedMedicalRecord } from '../types';

// Helper to convert strings to ArrayBuffer and back
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Derives a cryptographic key from a passphrase using PBKDF2.
 * @param passphrase The user-provided secret passphrase.
 * @param salt A random salt for the key derivation.
 * @returns A CryptoKey suitable for AES-GCM.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // As mentioned in HealthRecords.tsx console logs
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a medical record object using AES-GCM-256.
 * @param record The decrypted medical record object.
 * @param passphrase The passphrase to derive the encryption key from.
 * @returns An object containing the base64-encoded ciphertext, IV, and salt.
 */
export async function encryptMedicalRecord(
  record: DecryptedMedicalRecord,
  passphrase: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const jsonString = JSON.stringify(record);
  const encodedData = encoder.encode(jsonString);

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  // Helper to safely convert ArrayBuffer to Base64 without call stack issues.
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  // Convert ArrayBuffers to Base64 strings for storage using helper to avoid call stack limits
  const ciphertext = arrayBufferToBase64(encryptedData);
  const saltBase64 = arrayBufferToBase64(salt);
  const ivBase64 = arrayBufferToBase64(iv);

  return { ciphertext, iv: ivBase64, salt: saltBase64 };
}

/**
 * Decrypts a medical record ciphertext using AES-GCM-256.
 * @param ciphertextBase64 The base64-encoded encrypted data.
 * @param ivBase64 The base64-encoded initialization vector.
 * @param saltBase64 The base64-encoded salt used for key derivation.
 * @param passphrase The passphrase to derive the decryption key.
 * @returns The decrypted medical record object.
 */
export async function decryptMedicalRecord(
  ciphertextBase64: string,
  ivBase64: string,
  saltBase64: string,
  passphrase: string
): Promise<DecryptedMedicalRecord> {
  try {
    // Convert Base64 strings back to ArrayBuffers
    const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(ciphertextBase64).split('').map(c => c.charCodeAt(0)));

    const key = await deriveKey(passphrase, salt);

    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const jsonString = decoder.decode(decryptedData);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Falha na descriptografia. Verifique a chave ou os dados podem estar corrompidos.');
  }
}

/**
 * Masks a CPF for display purposes.
 * @param cpf The full CPF string.
 * @returns A partially anonymized CPF string.
 */
export function anonymizeCPF(cpf: string): string {
  if (!cpf || cpf.length < 14) return '***.***.***-**';
  return cpf.replace(/^\d{3}\.\d{3}/, '***.***');
}

/**
 * Calculates a SHA-256 hash for an audit log entry to ensure integrity.
 * @param logData A string representation of the log entry.
 * @returns A hex string of the SHA-256 hash.
 */
export async function calculateAuditHash(logData: string): Promise<string> {
  const encodedData = encoder.encode(logData);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a random secret string for 2FA setup.
 * @returns A random alphanumeric string.
 */
export function generateRandomSecret(): string {
  // Use crypto API for generating secure random values, not Math.random()
  const array = new Uint8Array(10);
  window.crypto.getRandomValues(array);
  const hexString = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return ('DRDiogoGONZAGA' + hexString).toUpperCase();
}
