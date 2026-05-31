import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormDesignerService, DesignerNode } from './form-designer.service';
import { SFSchema, SFUISchema } from '@delon/form';

@Component({
  selector: 'app-form-designer',
  template: `
    <div class="designer-container">
      <!-- 左侧：物料库 -->
      <div class="sidebar-left">
        <div class="sidebar-header"><h2>组件库</h2></div>
        <div
          class="sidebar-content"
          cdkDropList
          id="widget-list"
          [cdkDropListData]="widgets"
          [cdkDropListConnectedTo]="['canvas-list']"
          (cdkDropListDropped)="dropToCanvas($event)"
        >
          <div
            *ngFor="let item of widgets"
            class="widget-item"
            cdkDrag
            [cdkDragData]="item"
          >
            <i
              nz-icon
              [nzType]="item.icon"
              nzTheme="outline"
              class="widget-icon"
            ></i>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- 中间：画布 -->
      <div class="main-canvas">
        <div class="canvas-wrapper">
          <div class="canvas-header">
            <h2>表单画布</h2>
            <span class="tip">拖拽左侧组件到此处，点击选中编辑</span>
          </div>

          <div
            class="canvas-body"
            cdkDropList
            id="canvas-list"
            [cdkDropListData]="nodes"
            [cdkDropListConnectedTo]="['widget-list']"
            (cdkDropListDropped)="handleDrop($event)"
          >
            <!-- 空状态 -->
            <div *ngIf="nodes.length === 0" class="empty-state">
              请从左侧拖拽组件到此处
            </div>

            <!-- 表单项列表 -->
            <div
              *ngFor="let node of nodes; let i = index"
              class="canvas-item"
              [class.selected]="selectedId === node.id"
              (click)="selectNode(node.id)"
              cdkDrag
            >
              <!-- 操作栏 (选中时显示) -->
              <div class="item-actions" *ngIf="selectedId === node.id">
                <button
                  nz-button
                  nzType="text"
                  nzSize="small"
                  (click)="copyNode(node.id); $event.stopPropagation()"
                >
                  <i nz-icon nzType="copy"></i> 复制
                </button>
                <button
                  nz-button
                  nzType="text"
                  nzDanger
                  nzSize="small"
                  (click)="removeNode(node.id); $event.stopPropagation()"
                >
                  <i nz-icon nzType="delete"></i> 删除
                </button>
              </div>

              <!-- 实际表单控件预览 (简化版：直接使用 NZ 组件模拟，或者嵌入微型 SF) -->
              <!-- 为了保持设计器轻量，这里我们根据类型渲染一个简单的 NZ 控件作为预览 -->
              <div
                class="item-preview-content"
                (click)="$event.stopPropagation()"
              >
                <label class="preview-label">
                  {{ getNodeSchema(node).title }}
                  <span class="required" *ngIf="isRequired(node.key)">*</span>
                </label>

                <!-- 简单预览映射 -->
                <ng-container [ngSwitch]="node.type">
                  <input
                    *ngSwitchCase="'string'"
                    nz-input
                    disabled
                    placeholder="文本预览"
                  />
                  <input
                    *ngSwitchCase="'number'"
                    nz-input
                    type="number"
                    disabled
                    placeholder="0"
                  />
                  <textarea
                    *ngSwitchCase="'textarea'"
                    nz-input
                    disabled
                    rows="2"
                    placeholder="多行文本"
                  ></textarea>
                  <nz-switch
                    *ngSwitchCase="'boolean'"
                    [ngModel]="false"
                    disabled
                  ></nz-switch>
                  <nz-date-picker
                    *ngSwitchCase="'date'"
                    style="width:100%"
                    disabled
                  ></nz-date-picker>
                  <nz-select
                    *ngSwitchCase="'select'"
                    style="width:100%"
                    disabled
                    nzPlaceHolder="请选择"
                  ></nz-select>
                  <div *ngSwitchDefault class="text-gray-400 text-sm italic">
                    复杂控件预览暂不支持
                  </div>
                </ng-container>

                <div class="preview-desc" *ngIf="getNodeUI(node).description">
                  {{ getNodeUI(node).description }}
                </div>
              </div>

              <!-- 拖拽手柄 -->
              <div class="drag-handle" cdkDragHandle>
                <i nz-icon nzType="drag" nzTheme="outline"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- JSON 预览 -->
        <div class="json-preview">
          <pre>{{ schema | json }}</pre>
        </div>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="sidebar-right">
        <app-property-panel></app-property-panel>
      </div>
    </div>

    <style>
      /* 沿用之前的样式，增加以下新样式 */
      .canvas-body {
        padding: 20px;
        min-height: 300px;
      }
      .empty-state {
        text-align: center;
        color: #9ca3af;
        padding: 40px;
        border: 2px dashed #e5e7eb;
        border-radius: 8px;
      }

      .canvas-item {
        position: relative;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-bottom: 12px;
        padding: 16px;
        transition: all 0.2s;
        cursor: pointer;
      }

      .canvas-item:hover {
        border-color: #bfdbfe;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      .canvas-item.selected {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }

      .item-actions {
        position: absolute;
        top: -12px;
        right: 10px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 2px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 10;
        display: flex;
        gap: 4px;
      }

      .item-preview-content {
        pointer-events: none; /* 防止预览控件拦截点击 */
      }
      .preview-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: 14px;
        color: #374151;
      }
      .required {
        color: #ef4444;
        margin-left: 4px;
      }
      .preview-desc {
        font-size: 12px;
        color: #6b7280;
        margin-top: 4px;
      }

      .drag-handle {
        position: absolute;
        left: -25px;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        cursor: move;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .canvas-item:hover .drag-handle {
        opacity: 1;
      }

      /* CDK 拖拽样式 */
      .cdk-drag-placeholder {
        opacity: 0.4;
        border: 2px dashed #3b82f6;
        background: #eff6ff;
      }
      .cdk-drag-preview {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border-radius: 6px;
      }
    </style>
  `,
  styles: [
    `
      /* 核心布局容器：使用 Flexbox 实现左-中-右三栏布局 */
      .designer-container {
        display: flex;
        height: 100vh; /* 占满全屏高度 */
        width: 100%;
        overflow: hidden;
        background-color: #f3f4f6;
      }

      /* 左侧侧边栏 */
      .sidebar-left {
        width: 260px;
        background: white;
        border-right: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }

      .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
      }

      .sidebar-header h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      /* 物料项样式 */
      .widget-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        margin-bottom: 8px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        cursor: move;
        transition: all 0.2s;
      }

      .widget-item:hover {
        border-color: #3b82f6;
        color: #3b82f6;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .widget-icon {
        margin-right: 8px;
        font-size: 16px;
      }

      /* 中间画布区域 */
      .main-canvas {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #f9fafb;
      }

      .canvas-wrapper {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }

      .canvas-header {
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .canvas-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }

      .tip {
        font-size: 12px;
        color: #6b7280;
      }

      .canvas-body {
        min-height: 400px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        padding: 20px;
        position: relative;
      }

      /* 空状态 */
      .empty-state {
        text-align: center;
        color: #9ca3af;
        padding: 60px 20px;
        border: 2px dashed #e5e7eb;
        border-radius: 8px;
        pointer-events: none;
      }

      /* 画布中的表单项 */
      .canvas-item {
        position: relative;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-bottom: 12px;
        padding: 16px;
        transition: all 0.2s;
        cursor: pointer;
      }

      .canvas-item:hover {
        border-color: #bfdbfe;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .canvas-item.selected {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }

      /* 操作按钮栏 */
      .item-actions {
        position: absolute;
        top: -12px;
        right: 10px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 2px 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 10;
        display: flex;
        gap: 4px;
      }

      /* 预览内容 */
      .item-preview-content {
        pointer-events: none; /* 关键：防止内部输入框拦截点击事件 */
      }

      .preview-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: 14px;
        color: #374151;
      }

      .required {
        color: #ef4444;
        margin-left: 4px;
      }

      .preview-desc {
        font-size: 12px;
        color: #6b7280;
        margin-top: 4px;
      }

      /* 拖拽手柄 */
      .drag-handle {
        position: absolute;
        left: -28px;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        cursor: move;
        opacity: 0;
        transition: opacity 0.2s;
        padding: 4px;
      }

      .canvas-item:hover .drag-handle {
        opacity: 1;
      }

      /* 右侧属性面板 */
      .sidebar-right {
        width: 300px;
        background: white;
        border-left: 1px solid #e5e7eb;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      /* JSON 预览区 */
      .json-preview {
        height: 150px;
        background: #1f2937;
        color: #10b981;
        padding: 10px;
        overflow: auto;
        font-family: monospace;
        font-size: 12px;
        border-top: 1px solid #e5e7eb;
      }

      .json-preview pre {
        margin: 0;
      }

      /* CDK Drag & Drop 辅助样式 */
      .cdk-drag-placeholder {
        opacity: 0.4;
        border: 2px dashed #3b82f6;
        background: #eff6ff;
      }

      .cdk-drag-preview {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border-radius: 6px;
        background: white;
      }

      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class FormDesignerComponent implements OnInit {
  schema: SFSchema = { properties: {} };
  ui: SFUISchema = {};
  nodes: DesignerNode[] = [];
  selectedId: string | null = null;

  widgets = [
    { type: 'string', label: '文本输入', icon: 'font-size' },
    { type: 'number', label: '数字输入', icon: 'number' },
    { type: 'boolean', label: '开关', icon: 'check-square' },
    { type: 'date', label: '日期选择', icon: 'calendar' },
    { type: 'select', label: '下拉选择', icon: 'down' },
    { type: 'textarea', label: '多行文本', icon: 'enter' },
  ];

  constructor(private designerService: FormDesignerService) {}

  ngOnInit(): void {
    this.designerService.schema$.subscribe((s) => (this.schema = s));
    this.designerService.uiSchema$.subscribe((u) => (this.ui = u));
    this.designerService.nodes$.subscribe((n) => (this.nodes = n));
    this.designerService.selectedId$.subscribe((id) => (this.selectedId = id));
  }

  // 拖拽左侧物料到画布
  dropToCanvas(event: CdkDragDrop<any[]>) {
    // 如果是从画布内部拖拽（虽然逻辑上不应该发生，因为 connectedTo 是单向或双向但数据类型不同）
    if (event.previousContainer === event.container) {
      return;
    }

    // 从左侧拖过来：添加新字段
    const itemType = event.item.data.type;
    this.designerService.addField(itemType);
  }

  // 画布内部排序
  dropWithinCanvas(event: CdkDragDrop<DesignerNode[]>) {
    // 如果是从左侧物料库拖进来的
    if (event.previousContainer !== event.container) {
      const itemType = event.item.data.type;
      this.designerService.addField(itemType);
      return;
    }

    // 画布内部排序
    this.designerService.moveNode(event);
  }

  handleDrop(event: CdkDragDrop<any[]>) {
    // 如果从左侧物料库拖入
    if (event.previousContainer.id === 'widget-list') {
      const itemType = event.item.data.type;
      this.designerService.addField(itemType);
    }
    // 如果在画布内部排序
    else if (event.previousContainer.id === 'canvas-list') {
      this.designerService.moveNode(event as CdkDragDrop<DesignerNode[]>);
    }
  }

  selectNode(id: string) {
    this.designerService.selectNode(id);
  }

  copyNode(id: string) {
    this.designerService.copyNode(id);
  }

  removeNode(id: string) {
    this.designerService.removeNode(id);
  }

  // 辅助方法：获取当前节点的 Schema/UI
  getNodeSchema(node: DesignerNode): any {
    return this.schema.properties?.[node.key] || {};
  }
  getNodeUI(node: DesignerNode): any {
    return this.ui[node.key] || {};
  }
  isRequired(key: string): boolean {
    return !!this.schema.required?.includes(key);
  }
}
