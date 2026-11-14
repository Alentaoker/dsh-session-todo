using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using System.Windows.Media;

namespace DshSessionTodo
{
    internal sealed partial class TodoWindow
    {
        private static ResourceDictionary darkMenuResources;

        private static ResourceDictionary DarkMenuResources()
        {
            if (darkMenuResources != null) return darkMenuResources;
            darkMenuResources = (ResourceDictionary)XamlReader.Parse(@"
<ResourceDictionary xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml'>
  <Style TargetType='{x:Type ContextMenu}'>
    <Setter Property='OverridesDefaultStyle' Value='True'/>
    <Setter Property='SnapsToDevicePixels' Value='True'/>
    <Setter Property='HasDropShadow' Value='False'/>
    <Setter Property='FocusVisualStyle' Value='{x:Null}'/>
    <Setter Property='Template'><Setter.Value>
      <ControlTemplate TargetType='{x:Type ContextMenu}'>
        <Border Background='{DynamicResource TodoMenuSurface}' BorderBrush='{DynamicResource TodoLine}' BorderThickness='1' CornerRadius='9' Padding='5'>
          <ItemsPresenter KeyboardNavigation.DirectionalNavigation='Cycle' Grid.IsSharedSizeScope='True'/>
        </Border>
      </ControlTemplate>
    </Setter.Value></Setter>
  </Style>
  <Style TargetType='{x:Type MenuItem}'>
    <Setter Property='OverridesDefaultStyle' Value='True'/>
    <Setter Property='Foreground' Value='{DynamicResource TodoText}'/>
    <Setter Property='FontSize' Value='12'/>
    <Setter Property='FocusVisualStyle' Value='{x:Null}'/>
    <Setter Property='Template'><Setter.Value>
      <ControlTemplate TargetType='{x:Type MenuItem}'>
        <Grid SnapsToDevicePixels='True'>
          <Border x:Name='Surface' Background='Transparent' CornerRadius='5' Padding='7,6'>
            <Grid MinWidth='190'>
              <Grid.ColumnDefinitions><ColumnDefinition Width='20'/><ColumnDefinition Width='*'/><ColumnDefinition Width='14'/></Grid.ColumnDefinitions>
              <ContentPresenter x:Name='Icon' ContentSource='Icon' VerticalAlignment='Center' HorizontalAlignment='Left'/>
              <TextBlock x:Name='Check' Text='✓' Foreground='{DynamicResource TodoAccent}' FontSize='11' VerticalAlignment='Center' Visibility='Collapsed'/>
              <ContentPresenter Grid.Column='1' ContentSource='Header' RecognizesAccessKey='True' VerticalAlignment='Center' Margin='0,0,12,0'/>
              <Path x:Name='Arrow' Grid.Column='2' Data='M0,0 L3,3 0,6' Stroke='{DynamicResource TodoMuted}' StrokeThickness='1.2' Width='4' Height='7' VerticalAlignment='Center' Visibility='Collapsed'/>
            </Grid>
          </Border>
          <Popup x:Name='PART_Popup' Placement='Right' HorizontalOffset='4' VerticalOffset='-5' AllowsTransparency='True' Focusable='False' PopupAnimation='None' IsOpen='{Binding IsSubmenuOpen, RelativeSource={RelativeSource TemplatedParent}}'>
            <Border Background='{DynamicResource TodoMenuSurface}' BorderBrush='{DynamicResource TodoLine}' BorderThickness='1' CornerRadius='9' Padding='5'>
              <ItemsPresenter KeyboardNavigation.DirectionalNavigation='Cycle' Grid.IsSharedSizeScope='True'/>
            </Border>
          </Popup>
        </Grid>
        <ControlTemplate.Triggers>
          <Trigger Property='HasItems' Value='True'><Setter TargetName='Arrow' Property='Visibility' Value='Visible'/></Trigger>
          <Trigger Property='IsHighlighted' Value='True'><Setter TargetName='Surface' Property='Background' Value='{DynamicResource TodoHover}'/></Trigger>
          <Trigger Property='IsKeyboardFocusWithin' Value='True'><Setter TargetName='Surface' Property='Background' Value='{DynamicResource TodoHover}'/></Trigger>
          <Trigger Property='IsSubmenuOpen' Value='True'><Setter TargetName='Surface' Property='Background' Value='{DynamicResource TodoHover}'/></Trigger>
          <Trigger Property='IsChecked' Value='True'><Setter TargetName='Check' Property='Visibility' Value='Visible'/><Setter TargetName='Icon' Property='Visibility' Value='Collapsed'/></Trigger>
          <Trigger Property='IsEnabled' Value='False'><Setter Property='Opacity' Value='0.4'/></Trigger>
        </ControlTemplate.Triggers>
      </ControlTemplate>
    </Setter.Value></Setter>
  </Style>
  <Style TargetType='{x:Type Separator}'>
    <Setter Property='OverridesDefaultStyle' Value='True'/>
    <Setter Property='Template'><Setter.Value><ControlTemplate TargetType='{x:Type Separator}'><Border Height='1' Background='{DynamicResource TodoLine}' Margin='9,5'/></ControlTemplate></Setter.Value></Setter>
  </Style>
</ResourceDictionary>");
            darkMenuResources["TodoMenuSurface"] = MenuBrush;
            darkMenuResources["TodoLine"] = LineBrush;
            darkMenuResources["TodoText"] = TextBrush;
            darkMenuResources["TodoAccent"] = GreenBrush;
            darkMenuResources["TodoMuted"] = MutedBrush;
            darkMenuResources["TodoHover"] = CardHoverBrush;
            return darkMenuResources;
        }

        private ContextMenu DarkMenu()
        {
            ResourceDictionary resources = DarkMenuResources();
            ContextMenu menu = new ContextMenu { FontFamily = FontFamily, FontSize = 12, Foreground = TextBrush, Style = (Style)resources[typeof(ContextMenu)] };
            menu.Resources.MergedDictionaries.Add(resources);
            menu.Resources[MenuItem.SeparatorStyleKey] = (Style)resources[typeof(Separator)];
            menu.Opened += delegate { openMenus++; };
            menu.Closed += delegate { openMenus = Math.Max(0, openMenus - 1); };
            return menu;
        }

    }
}
