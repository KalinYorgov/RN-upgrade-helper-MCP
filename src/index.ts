#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from 'playwright';
import { z } from 'zod';

class ReactNativeUpgradeHelperMCP {
  private server: McpServer;

  constructor() {
    this.server = new McpServer(
      {
        name: 'react-native-upgrade-helper',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  private setupTools() {
    // Tool to get comprehensive upgrade information
    this.server.registerTool(
      'get_upgrade_info',
      {
        title: 'Get React Native Upgrade Information',
        description: 'Extract React Native upgrade information between two versions',
        inputSchema: {
          fromVersion: z.string().describe('Source React Native version (e.g., "0.70.14")'),
          toVersion: z.string().describe('Target React Native version (e.g., "0.74.0")'),
          packageName: z.string().optional().default('com.example.app').describe('Package name for the project'),
          projectName: z.string().optional().default('ExampleApp').describe('Project name'),
        },
      },
      async ({ fromVersion, toVersion, packageName, projectName }) => {
        try {
          const result = await this.getUpgradeInfo(fromVersion, toVersion, packageName, projectName);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool to get specific file differences
    this.server.registerTool(
      'get_file_diff',
      {
        title: 'Get Specific File Diff',
        description: 'Get specific file differences for React Native upgrade',
        inputSchema: {
          fromVersion: z.string().describe('Source React Native version'),
          toVersion: z.string().describe('Target React Native version'),
          fileName: z.string().describe('Specific file to get diff for (e.g., "package.json", "android/build.gradle")'),
          packageName: z.string().optional().default('com.example.app').describe('Package name'),
          projectName: z.string().optional().default('ExampleApp').describe('Project name'),
        },
      },
      async ({ fromVersion, toVersion, fileName, packageName, projectName }) => {
        try {
          const result = await this.getFileDiff(fromVersion, toVersion, fileName, packageName, projectName);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  private async getUpgradeInfo(
    fromVersion: string,
    toVersion: string,
    packageName: string = 'com.example.app',
    projectName: string = 'ExampleApp'
  ) {
    const url = `https://react-native-community.github.io/upgrade-helper/`;

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for the form to load
      await page.waitForSelector('input', { timeout: 10000 });

      // Fill out the form fields using JavaScript evaluation for more reliable targeting
      await page.evaluate(
        (args: { fromVer: string; toVer: string; appName: string; appPackage: string }) => {
          const inputs = document.querySelectorAll('input');
          inputs.forEach((input) => {
            const label = input.previousElementSibling?.textContent || input.parentElement?.textContent || '';
            
            if (label.includes('current') || label.includes('from')) {
              (input as HTMLInputElement).value = args.fromVer;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (label.includes('upgrade') || label.includes('to')) {
              (input as HTMLInputElement).value = args.toVer;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (label.includes('app name')) {
              (input as HTMLInputElement).value = args.appName;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (label.includes('package')) {
              (input as HTMLInputElement).value = args.appPackage;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        },
        {
          fromVer: fromVersion,
          toVer: toVersion,
          appName: projectName,
          appPackage: packageName,
        }
      );

      // Wait a moment for any reactive updates
      await page.waitForTimeout(2000);

      // Look for submit button or trigger update
      const submitButton = await page.$('button[type="submit"], button:has-text("Show me how to upgrade"), button:has-text("Generate"), button:has-text("Update")');
      if (submitButton) {
        await submitButton.click();
      }

      // Wait for the diff content to load after form submission
      await page.waitForSelector('[data-testid="file-diff"], .diff-container, .file-diff', { timeout: 15000 });

      // Extract all file changes with flexible selectors
      const fileChanges = await page.evaluate(() => {
        const changes: Array<{
          fileName: string;
          changeType: string;
          hasChanges: boolean;
          content?: string;
        }> = [];

        // Try multiple possible selectors for file diffs
        const possibleSelectors = [
          '[data-testid="file-diff"]',
          '.file-diff',
          '.diff-container',
          '.file-change',
          '[class*="file"]',
          '[class*="diff"]'
        ];

        let fileItems: NodeListOf<Element> | null = null;
        
        for (const selector of possibleSelectors) {
          fileItems = document.querySelectorAll(selector);
          if (fileItems.length > 0) break;
        }

        if (!fileItems || fileItems.length === 0) {
          // Fallback: look for any element that might contain file information
          fileItems = document.querySelectorAll('*[class*="file"], *[data-*="file"], *:has(> *[class*="diff"])');
        }
        
        fileItems?.forEach((item) => {
          // Try multiple ways to get file name
          const fileNameElement = item.querySelector('[data-testid="file-name"]') || 
                                 item.querySelector('.file-name') ||
                                 item.querySelector('.filename') ||
                                 item.querySelector('strong') ||
                                 item.querySelector('h3, h4, h5');
          
          const fileName = fileNameElement?.textContent?.trim() || 
                          item.getAttribute('data-file') ||
                          item.className.includes('file') ? 'File detected' : 'Unknown file';
          
          // Try to determine change type
          const changeTypeElement = item.querySelector('[data-testid="change-type"]') ||
                                   item.querySelector('.change-type') ||
                                   item.querySelector('.badge');
          
          let changeType = changeTypeElement?.textContent?.trim() || 'modified';
          
          // Infer change type from classes or content
          if (item.className.includes('added') || item.textContent?.includes('+')) {
            changeType = 'added';
          } else if (item.className.includes('deleted') || item.textContent?.includes('-')) {
            changeType = 'deleted';
          }
          
          // Get diff content
          const diffContent = item.querySelector('.diff-content') || 
                             item.querySelector('.file-diff-content') ||
                             item.querySelector('pre') ||
                             item.querySelector('code') ||
                             item;
          
          const content = diffContent?.textContent || diffContent?.innerHTML || '';
          
          if (fileName && fileName !== 'Unknown file') {
            changes.push({
              fileName,
              changeType,
              hasChanges: content.length > 0,
              content: content.substring(0, 2000), // Limit content size
            });
          }
        });

        return changes;
      });

      // Get summary information with flexible selectors
      const summary = await page.evaluate(() => {
        const summarySelectors = [
          '[data-testid="upgrade-summary"]',
          '.upgrade-summary',
          '.summary',
          'p:has-text("upgrade")',
          'div:has-text("changes")'
        ];
        
        for (const selector of summarySelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.trim()) {
            return element.textContent.trim();
          }
        }
        
        return 'No summary available';
      });

      // Get breaking changes if available with flexible selectors
      const breakingChanges = await page.evaluate(() => {
        const breakingSelectors = [
          '[data-testid="breaking-change"]',
          '.breaking-change',
          '*:has-text("breaking")',
          '.warning',
          '.alert'
        ];
        
        const changes: string[] = [];
        
        for (const selector of breakingSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && !changes.includes(text)) {
              changes.push(text);
            }
          });
        }
        
        return changes;
      });

      const result = {
        fromVersion,
        toVersion,
        packageName,
        projectName,
        url,
        summary,
        breakingChanges,
        fileChanges,
        totalFiles: fileChanges.length,
        modifiedFiles: fileChanges.filter(f => f.changeType === 'modified').length,
        addedFiles: fileChanges.filter(f => f.changeType === 'added').length,
        deletedFiles: fileChanges.filter(f => f.changeType === 'deleted').length,
      };

      return result;
    } finally {
      await browser.close();
    }
  }

  private async getFileDiff(
    fromVersion: string,
    toVersion: string,
    fileName: string,
    packageName: string = 'com.example.app',
    projectName: string = 'ExampleApp'
  ) {
    const url = `https://react-native-community.github.io/upgrade-helper/`;

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for the form to load
      await page.waitForSelector('input', { timeout: 10000 });

      // Fill version fields using JavaScript evaluation for more reliable targeting
      await page.evaluate(
        (args: { fromVer: string; toVer: string; appName: string; appPackage: string }) => {
          const inputs = document.querySelectorAll('input');
          inputs.forEach((input) => {
            const label = input.previousElementSibling?.textContent || input.parentElement?.textContent || '';
            
            if (label.includes('current') || label.includes('from')) {
              (input as HTMLInputElement).value = args.fromVer;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (label.includes('upgrade') || label.includes('to')) {
              (input as HTMLInputElement).value = args.toVer;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (label.includes('app name')) {
              (input as HTMLInputElement).value = args.appName;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (label.includes('package')) {
              (input as HTMLInputElement).value = args.appPackage;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        },
        {
          fromVer: fromVersion,
          toVer: toVersion,
          appName: projectName,
          appPackage: packageName,
        }
      );

      await page.waitForTimeout(2000);

      const submitButton = await page.$('button[type="submit"], button:has-text("Show me how to upgrade"), button:has-text("Generate"), button:has-text("Update")');
      if (submitButton) {
        await submitButton.click();
      }

      await page.waitForSelector('[data-testid="file-diff"], .diff-container, .file-diff', { timeout: 15000 });

      // Find and extract specific file diff with more flexible selectors
      const fileDiff = await page.evaluate((targetFileName: string) => {
        const possibleSelectors = [
          '[data-testid="file-diff"]',
          '.file-diff',
          '.diff-container',
          '.file-change',
          '[class*="file"]',
          '[class*="diff"]'
        ];

        let fileItems: NodeListOf<Element> | null = null;
        
        for (const selector of possibleSelectors) {
          fileItems = document.querySelectorAll(selector);
          if (fileItems.length > 0) break;
        }

        if (!fileItems || fileItems.length === 0) {
          fileItems = document.querySelectorAll('*[class*="file"], *[data-*="file"], *:has(> *[class*="diff"])');
        }
        
        for (const item of Array.from(fileItems || [])) {
          const fileNameElement = item.querySelector('[data-testid="file-name"]') || 
                                 item.querySelector('.file-name') ||
                                 item.querySelector('.filename') ||
                                 item.querySelector('strong') ||
                                 item.querySelector('h3, h4, h5');
          
          const currentFileName = fileNameElement?.textContent?.trim() ||
                                 item.getAttribute('data-file') ||
                                 '';
          
          if (currentFileName === targetFileName || 
              currentFileName?.endsWith(targetFileName) ||
              targetFileName.endsWith(currentFileName)) {
            
            const changeTypeElement = item.querySelector('[data-testid="change-type"]') ||
                                     item.querySelector('.change-type') ||
                                     item.querySelector('.badge');
            
            let changeType = changeTypeElement?.textContent?.trim() || 'modified';
            
            if (item.className.includes('added') || item.textContent?.includes('+')) {
              changeType = 'added';
            } else if (item.className.includes('deleted') || item.textContent?.includes('-')) {
              changeType = 'deleted';
            }
            
            const diffContent = item.querySelector('.diff-content') || 
                               item.querySelector('.file-diff-content') ||
                               item.querySelector('pre') ||
                               item.querySelector('code') ||
                               item;
            
            const content = diffContent?.textContent || diffContent?.innerHTML || '';
            
            return {
              fileName: currentFileName,
              changeType,
              content,
              found: true,
            };
          }
        }
        
        return { found: false };
      }, fileName);

      if (!fileDiff.found) {
        return {
          fromVersion,
          toVersion,
          fileName,
          found: false,
          message: `File "${fileName}" not found in the upgrade diff. Available files can be retrieved using get_upgrade_info.`,
        };
      }

      return {
        fromVersion,
        toVersion,
        fileName: fileDiff.fileName,
        changeType: fileDiff.changeType,
        diff: fileDiff.content,
        found: true,
      };
    } finally {
      await browser.close();
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('React Native Upgrade Helper MCP Server running on stdio');
  }
}

const server = new ReactNativeUpgradeHelperMCP();
server.run().catch(console.error);