#!/usr/bin/env python3
"""
Pixer 固件升級腳本
用於 Electron 應用程式呼叫固件升級功能
"""

import sys
import argparse
import os
from upload import firmware_upgrade_before_check

def main():
    parser = argparse.ArgumentParser(description='Pixer 固件升級工具')
    
    # 固件檔案參數
    parser.add_argument('--ble-file', help='BLE 固件檔案路徑')
    parser.add_argument('--ite-file', help='ITE 固件檔案路徑')
    parser.add_argument('--bsp-file', help='BSP 固件檔案路徑')
    
    # 目標版本參數
    parser.add_argument('--ble-version', type=int, default=14, help='BLE 目標版本')
    parser.add_argument('--ite-version', type=int, default=35, help='ITE 目標版本')
    parser.add_argument('--bsp-version', type=int, default=1702061, help='BSP 目標版本')
    
    # 連線參數
    parser.add_argument('--host', default='192.168.1.1', help='Pixer 裝置 IP 位址')
    parser.add_argument('--port', type=int, default=6000, help='Pixer 裝置連接埠')
    
    args = parser.parse_args()
    
    try:
        print(f"[FW] 開始固件升級程序...")
        print(f"[FW] 目標版本: BLE={args.ble_version}, ITE={args.ite_version}, BSP={args.bsp_version}")
        
        # 檢查檔案是否存在
        files_to_check = []
        if args.ble_file:
            files_to_check.append(('BLE', args.ble_file))
        if args.ite_file:
            files_to_check.append(('ITE', args.ite_file))
        if args.bsp_file:
            files_to_check.append(('BSP', args.bsp_file))
        
        for file_type, file_path in files_to_check:
            if not os.path.exists(file_path):
                print(f"[FW] 錯誤: {file_type} 固件檔案不存在: {file_path}")
                sys.exit(1)
            print(f"[FW] 找到 {file_type} 固件檔案: {file_path}")
        
        # 呼叫固件升級函數
        firmware_upgrade_before_check(
            host=args.host,
            port=args.port,
            mBleVerNo=args.ble_version,
            mIteVerNo=args.ite_version,
            mBspVerNo=args.bsp_version,
            ble_bin_path=args.ble_file or 'ble.bin',
            ite_bin_path=args.ite_file or 'ite.bin',
            bsp_bin_path=args.bsp_file or 'pixer.bin'
        )
        
        print(f"[FW] 固件升級程序完成")
        sys.exit(0)
        
    except Exception as e:
        print(f"[FW] 固件升級失敗: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
